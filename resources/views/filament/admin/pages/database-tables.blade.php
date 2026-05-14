@php
    /** @var list<array{kind: string, name: string, schema: ?string, engine: ?string, size: ?int, size_human: string, comment: string}> $rows */
    $rows = $rows ?? [];
@endphp

<div class="fi-section-content-ctn">
    @if ($rows === [])
        <p class="text-sm text-gray-500 dark:text-gray-400">
            No tables were returned. Check the database connection or application logs.
        </p>
    @else
        <div class="overflow-x-auto rounded-xl ring-1 ring-gray-950/5 dark:ring-white/10">
            <table class="w-full table-auto divide-y divide-gray-200 text-start text-sm dark:divide-white/5">
                <thead class="bg-gray-50 dark:bg-white/5">
                    <tr>
                        <th class="px-3 py-2 font-semibold text-gray-950 dark:text-white">Type</th>
                        <th class="px-3 py-2 font-semibold text-gray-950 dark:text-white">Name</th>
                        <th class="px-3 py-2 font-semibold text-gray-950 dark:text-white">Schema</th>
                        <th class="px-3 py-2 font-semibold text-gray-950 dark:text-white">Engine</th>
                        <th class="px-3 py-2 font-semibold text-gray-950 dark:text-white">Data + indexes</th>
                        <th class="px-3 py-2 font-semibold text-gray-950 dark:text-white">Comment</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white dark:divide-white/5 dark:bg-gray-900">
                    @foreach ($rows as $row)
                        <tr class="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td class="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                {{ $row['kind'] }}
                            </td>
                            <td class="px-3 py-2 font-medium text-gray-950 dark:text-white">
                                {{ $row['name'] }}
                            </td>
                            <td class="px-3 py-2 text-gray-600 dark:text-gray-300">
                                {{ $row['schema'] ?? '—' }}
                            </td>
                            <td class="px-3 py-2 text-gray-600 dark:text-gray-300">
                                {{ $row['engine'] ?? '—' }}
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                {{ $row['size_human'] }}
                            </td>
                            <td class="px-3 py-2 text-gray-600 dark:text-gray-300 max-w-md truncate" title="{{ $row['comment'] }}">
                                {{ $row['comment'] !== '' ? $row['comment'] : '—' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ count($rows) }} object(s) — “Data + indexes” is approximate on-disk size for MySQL tables (not row count).
        </p>
    @endif
</div>
