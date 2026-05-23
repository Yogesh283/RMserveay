@php
    /** @var array<string, mixed> $report */
    /** @var bool $checked */
    $report = $report ?? [];
    $checked = $checked ?? false;
@endphp

<div class="fi-section-content-ctn space-y-6 text-sm">
    @if (! $checked)
        <p class="text-gray-500 dark:text-gray-400">
            Click <strong>Look up user</strong> and enter a user ID or login UID (e.g. <code>157</code> or <code>vkd</code>).
        </p>
    @else
        @php
            $user = $report['user'] ?? [];
            $totals = $report['totals'] ?? [];
            $members = $report['members'] ?? ['left' => [], 'right' => []];
        @endphp

        <div class="rounded-xl bg-primary-50 px-4 py-3 ring-1 ring-primary-200 dark:bg-primary-500/10 dark:ring-primary-500/30">
            <p class="font-semibold text-gray-950 dark:text-white">
                {{ $user['id_uid'] ?? ('#'.($user['id'] ?? '—').' / '.($user['login_uid'] ?? '')) }} — {{ $user['name'] ?? '' }}
            </p>
            <p class="mt-1 text-gray-600 dark:text-gray-300">
                Wallet: ${{ $user['wallet_balance'] ?? '0.00' }} ·
                Own slots: sub {{ $user['sub_panel_count'] ?? 0 }}/9 · super {{ $user['super_sub_panel_count'] ?? 0 }}/9 ·
                active panelist: {{ ($user['active_panelist'] ?? false) ? 'Yes' : 'No' }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Left child ID: {{ $report['left_child_id'] ?? '—' }} · Right child ID: {{ $report['right_child_id'] ?? '—' }}
            </p>
        </div>

        <div class="overflow-x-auto rounded-xl ring-1 ring-gray-950/5 dark:ring-white/10">
            <table class="w-full table-auto divide-y divide-gray-200 text-start dark:divide-white/5">
                <thead class="bg-gray-50 dark:bg-white/5">
                    <tr>
                        <th class="px-3 py-2 font-semibold">Scope</th>
                        <th class="px-3 py-2 font-semibold text-end">Left leg</th>
                        <th class="px-3 py-2 font-semibold text-end">Right leg</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white dark:divide-white/5 dark:bg-gray-900">
                    @foreach ($totals as $scope => $row)
                        <tr>
                            <td class="px-3 py-2 font-medium">{{ $row['label'] ?? $scope }}</td>
                            <td class="px-3 py-2 text-end tabular-nums">{{ $row['left'] ?? 0 }}</td>
                            <td class="px-3 py-2 text-end tabular-nums">{{ $row['right'] ?? 0 }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
            Totals match My Team “Total” rows. Member lists sorted by wallet balance (highest first).
        </p>

        @foreach (['left' => 'Left leg members', 'right' => 'Right leg members'] as $legKey => $legTitle)
            @php $leg = $members[$legKey] ?? ['active' => [], 'sub' => [], 'super' => []]; @endphp
            <div>
                <h3 class="mb-2 text-base font-semibold text-gray-950 dark:text-white">{{ $legTitle }}</h3>

                @foreach (['active' => 'Active panelists', 'sub' => 'Sub panels (count per user)', 'super' => 'Super panels (count per user)'] as $type => $typeLabel)
                    @php $rows = $leg[$type] ?? []; @endphp
                    <details class="mb-3 rounded-lg ring-1 ring-gray-200 dark:ring-white/10" @if(count($rows) > 0) open @endif>
                        <summary class="cursor-pointer bg-gray-50 px-3 py-2 font-medium dark:bg-white/5">
                            {{ $typeLabel }} ({{ count($rows) }})
                        </summary>
                        @if ($rows === [])
                            <p class="px-3 py-2 text-gray-500">None</p>
                        @else
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="border-t border-gray-200 dark:border-white/10">
                                        <th class="px-3 py-1 text-start">ID / UID</th>
                                        <th class="px-3 py-1 text-start">Name</th>
                                        <th class="px-3 py-1 text-end">Wallet</th>
                                        <th class="px-3 py-1 text-end">Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($rows as $m)
                                        <tr class="border-t border-gray-100 dark:border-white/5">
                                            <td class="px-3 py-1 font-medium">{{ $m['id_uid'] ?? ($m['id'].' / '.$m['login_uid']) }}</td>
                                            <td class="px-3 py-1">{{ $m['name'] }}</td>
                                            <td class="px-3 py-1 text-end tabular-nums">${{ $m['wallet_balance'] ?? '0.00' }}</td>
                                            <td class="px-3 py-1 text-end tabular-nums">{{ $m['count'] }}</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        @endif
                    </details>
                @endforeach
            </div>
        @endforeach
    @endif
</div>
