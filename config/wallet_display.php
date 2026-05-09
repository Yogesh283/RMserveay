<?php

/**
 * Display / limits for USDT (BEP-20) wallet operations (treasury is informational until chain verification is wired).
 *
 * Routing rules (enforced in application services):
 * - All programme income (surveys, matching, level, direct commission, deposits) credits the user's MAIN wallet (`wallet_balance`).
 * - On-chain withdrawal debits MAIN only (`MemberWalletController::withdraw`). Funds in P2P must be moved to main first.
 * - P2P (`p2p_wallet_balance`) is only changed by: main→P2P moves, P2P→main moves, P2P member-to-member transfers (WalletBucketService), never by income payouts.
 */
return [

    'network_label' => env('WALLET_NETWORK_LABEL', 'BEP-20 (Binance Smart Chain)'),

    'asset' => env('WALLET_ASSET_SYMBOL', 'USDT'),

    /** Treasury address shown for direct deposits — set in .env for production. */
    'treasury_bep20_address' => env('WALLET_TREASURY_BEP20', '0x0000000000000000000000000000000000000000'),

    'min_deposit_usd' => env('WALLET_MIN_DEPOSIT_USD', '1.00'),

    'min_withdraw_usd' => env('WALLET_MIN_WITHDRAW_USD', '10.00'),

    'min_p2p_usd' => env('WALLET_MIN_P2P_USD', '0.01'),

    /** Direct on-chain withdrawal fee (applied to gross amount debited from main wallet). */
    'direct_withdrawal_fee_rate' => env('WALLET_DIRECT_WITHDRAWAL_FEE_RATE', '0.15'),

    /** Bonus when moving funds main → P2P internal wallet (extra % credited to P2P bucket). */
    'main_to_p2p_bonus_rate' => env('WALLET_MAIN_TO_P2P_BONUS_RATE', '0.10'),

];
