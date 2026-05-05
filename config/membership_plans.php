<?php

/**
 * Sequential membership plans — user must purchase in order (tier 0 → plan[0], then plan[1], …).
 */
return [
    'plans' => [
        [
            'slug' => 'basic',
            'name' => 'Basic Plan',
            'tagline' => 'Entry access and standard earning multipliers.',
            'price_usd' => '29.00',
            'features' => [
                'Standard survey access',
                'Basic support',
                'Eligible for all programme income types',
            ],
        ],
        [
            'slug' => 'pro',
            'name' => 'Pro Plan',
            'tagline' => 'Higher priority and enhanced limits.',
            'price_usd' => '99.00',
            'features' => [
                'Everything in Basic',
                'Priority survey matching',
                'Higher daily matching caps (where applicable)',
            ],
        ],
        [
            'slug' => 'super',
            'name' => 'Super Plan',
            'tagline' => 'Maximum tier for power users.',
            'price_usd' => '299.00',
            'features' => [
                'Everything in Pro',
                'Premium placement',
                'Dedicated programme benefits',
            ],
        ],
    ],
];
