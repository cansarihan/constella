#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env, String,
};

/// Her bağışta yayılan event — frontend bunu RPC getEvents ile canlı dinler.
#[contractevent]
#[derive(Clone)]
pub struct DonationEvent {
    #[topic]
    pub donor: Address,
    pub amount: i128,
    pub total_raised: i128,
}

/// Fon çekildiğinde yayılan event.
#[contractevent]
#[derive(Clone)]
pub struct WithdrawEvent {
    #[topic]
    pub admin: Address,
    pub amount: i128,
}

/// Hata tipleri — frontend bunları yakalayıp kullanıcıya gösterir.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    DeadlinePassed = 4,
    GoalNotReached = 5,
    AlreadyWithdrawn = 6,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Title,
    Goal,
    Deadline,
    Raised,
    Contributors,
    Withdrawn,
    Contribution(Address),
}

/// get_state ile frontend'e dönen tüm kampanya durumu.
#[contracttype]
#[derive(Clone)]
pub struct State {
    pub admin: Address,
    pub token: Address,
    pub title: String,
    pub goal: i128,
    pub deadline: u64,
    pub raised: i128,
    pub contributors: u32,
    pub withdrawn: bool,
}

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contract]
pub struct CrowdfundingContract;

#[contractimpl]
impl CrowdfundingContract {
    /// Kampanyayı kurar: hedef miktar, son tarih, bağış token'ı (testnet'te native XLM SAC).
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        title: String,
        goal: i128,
        deadline: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if goal <= 0 {
            return Err(Error::InvalidAmount);
        }
        admin.require_auth();

        let s = env.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Token, &token);
        s.set(&DataKey::Title, &title);
        s.set(&DataKey::Goal, &goal);
        s.set(&DataKey::Deadline, &deadline);
        s.set(&DataKey::Raised, &0i128);
        s.set(&DataKey::Contributors, &0u32);
        s.set(&DataKey::Withdrawn, &false);
        s.extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    /// Bağış yapar: token'ı bağışçıdan kontrata aktarır, sayaçları günceller, event yayar.
    pub fn donate(env: Env, donor: Address, amount: i128) -> Result<i128, Error> {
        let s = env.storage().instance();
        if !s.has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let deadline: u64 = s.get(&DataKey::Deadline).unwrap();
        if env.ledger().timestamp() > deadline {
            return Err(Error::DeadlinePassed);
        }
        donor.require_auth();

        let token_addr: Address = s.get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&donor, &env.current_contract_address(), &amount);

        let key = DataKey::Contribution(donor.clone());
        let prev: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if prev == 0 {
            let c: u32 = s.get(&DataKey::Contributors).unwrap();
            s.set(&DataKey::Contributors, &(c + 1));
        }
        env.storage().persistent().set(&key, &(prev + amount));
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        let raised: i128 = s.get(&DataKey::Raised).unwrap();
        let new_raised = raised + amount;
        s.set(&DataKey::Raised, &new_raised);
        s.extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);

        // Real-time event — frontend RPC getEvents ile bunu canlı akıtır.
        DonationEvent {
            donor: donor.clone(),
            amount,
            total_raised: new_raised,
        }
        .publish(&env);

        Ok(new_raised)
    }

    /// Hedefe ulaşıldıysa toplanan fonu admin'e aktarır.
    pub fn withdraw(env: Env) -> Result<i128, Error> {
        let s = env.storage().instance();
        let admin: Address = s.get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let withdrawn: bool = s.get(&DataKey::Withdrawn).unwrap_or(false);
        if withdrawn {
            return Err(Error::AlreadyWithdrawn);
        }
        let goal: i128 = s.get(&DataKey::Goal).unwrap();
        let raised: i128 = s.get(&DataKey::Raised).unwrap();
        if raised < goal {
            return Err(Error::GoalNotReached);
        }

        let token_addr: Address = s.get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &admin, &raised);

        s.set(&DataKey::Withdrawn, &true);
        WithdrawEvent {
            admin,
            amount: raised,
        }
        .publish(&env);
        Ok(raised)
    }

    /// Tüm kampanya durumunu döner.
    pub fn get_state(env: Env) -> Result<State, Error> {
        let s = env.storage().instance();
        if !s.has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(State {
            admin: s.get(&DataKey::Admin).unwrap(),
            token: s.get(&DataKey::Token).unwrap(),
            title: s.get(&DataKey::Title).unwrap(),
            goal: s.get(&DataKey::Goal).unwrap(),
            deadline: s.get(&DataKey::Deadline).unwrap(),
            raised: s.get(&DataKey::Raised).unwrap(),
            contributors: s.get(&DataKey::Contributors).unwrap(),
            withdrawn: s.get(&DataKey::Withdrawn).unwrap_or(false),
        })
    }

    /// Bir adresin toplam bağışını döner.
    pub fn get_contribution(env: Env, donor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(donor))
            .unwrap_or(0)
    }
}

mod test;
