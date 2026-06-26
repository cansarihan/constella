#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Address, Env, String};

fn setup() -> (Env, Address, Address, token::Client<'static>, token::StellarAssetClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = token::Client::new(&env, &sac.address());
    let token_admin = token::StellarAssetClient::new(&env, &sac.address());

    (env, admin, sac.address(), token_client, token_admin)
}

fn deploy(env: &Env) -> CrowdfundingContractClient<'static> {
    let id = env.register(CrowdfundingContract, ());
    CrowdfundingContractClient::new(env, &id)
}

#[test]
fn test_initialize_and_state() {
    let (env, admin, token, _tc, _ta) = setup();
    let c = deploy(&env);
    c.initialize(
        &admin,
        &token,
        &String::from_str(&env, "Save the Reef"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );

    let st = c.get_state();
    assert_eq!(st.goal, 1000);
    assert_eq!(st.raised, 0);
    assert_eq!(st.contributors, 0);
    assert_eq!(st.withdrawn, false);
}

#[test]
fn test_donate_flow() {
    let (env, admin, token, _tc, ta) = setup();
    let c = deploy(&env);
    c.initialize(
        &admin,
        &token,
        &String::from_str(&env, "Save the Reef"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );

    let donor = Address::generate(&env);
    ta.mint(&donor, &500);

    let raised = c.donate(&donor, &300);
    assert_eq!(raised, 300);
    assert_eq!(c.get_state().raised, 300);
    assert_eq!(c.get_state().contributors, 1);
    assert_eq!(c.get_contribution(&donor), 300);

    // Aynı bağışçı tekrar bağış yapınca contributor sayısı artmamalı.
    c.donate(&donor, &200);
    assert_eq!(c.get_state().raised, 500);
    assert_eq!(c.get_state().contributors, 1);
    assert_eq!(c.get_contribution(&donor), 500);
}

#[test]
fn test_invalid_amount_error() {
    let (env, admin, token, _tc, _ta) = setup();
    let c = deploy(&env);
    c.initialize(
        &admin,
        &token,
        &String::from_str(&env, "X"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );
    let donor = Address::generate(&env);
    let res = c.try_donate(&donor, &0);
    assert_eq!(res, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_deadline_passed_error() {
    let (env, admin, token, _tc, ta) = setup();
    let c = deploy(&env);
    let deadline = env.ledger().timestamp() + 100;
    c.initialize(&admin, &token, &String::from_str(&env, "X"), &1000, &deadline);

    let donor = Address::generate(&env);
    ta.mint(&donor, &500);

    env.ledger().set_timestamp(deadline + 1);
    let res = c.try_donate(&donor, &100);
    assert_eq!(res, Err(Ok(Error::DeadlinePassed)));
}

#[test]
fn test_withdraw_goal_not_reached() {
    let (env, admin, token, _tc, ta) = setup();
    let c = deploy(&env);
    c.initialize(
        &admin,
        &token,
        &String::from_str(&env, "X"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );
    let donor = Address::generate(&env);
    ta.mint(&donor, &500);
    c.donate(&donor, &500);

    let res = c.try_withdraw();
    assert_eq!(res, Err(Ok(Error::GoalNotReached)));
}

#[test]
fn test_withdraw_success() {
    let (env, admin, token, tc, ta) = setup();
    let c = deploy(&env);
    c.initialize(
        &admin,
        &token,
        &String::from_str(&env, "X"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );
    let donor = Address::generate(&env);
    ta.mint(&donor, &1500);
    c.donate(&donor, &1200);

    let withdrawn = c.withdraw();
    assert_eq!(withdrawn, 1200);
    assert_eq!(tc.balance(&admin), 1200);
    assert_eq!(c.get_state().withdrawn, true);

    // İkinci çekim hata vermeli.
    let res = c.try_withdraw();
    assert_eq!(res, Err(Ok(Error::AlreadyWithdrawn)));
}

#[test]
fn test_already_initialized() {
    let (env, admin, token, _tc, _ta) = setup();
    let c = deploy(&env);
    c.initialize(
        &admin,
        &token,
        &String::from_str(&env, "X"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );
    let res = c.try_initialize(
        &admin,
        &token,
        &String::from_str(&env, "X"),
        &1000,
        &(env.ledger().timestamp() + 10_000),
    );
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}
