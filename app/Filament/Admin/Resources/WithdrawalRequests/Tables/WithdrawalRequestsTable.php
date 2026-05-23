<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests\Tables;

use App\Filament\Admin\Resources\WithdrawalRequests\WithdrawalPayoutActions;
use App\Filament\Admin\Support\AdminUserTableColumns;
use App\Models\WalletTransaction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class WithdrawalRequestsTable
{
    public static function configure(Table $table): Table
    {
        $payoutsOn = WithdrawalPayoutActions::payoutsEnabled();

        return $table
            ->columns([
                TextColumn::make('id')
                    ->label('#')
                    ->sortable(),
                ...AdminUserTableColumns::identity('user'),
                TextColumn::make('user.name')
                    ->label('Name')
                    ->searchable(),
                TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('meta.gross_usd')
                    ->label('Gross (USD)')
                    ->money('USD'),
                TextColumn::make('meta.fee_usd')
                    ->label('Fee')
                    ->money('USD')
                    ->toggleable(),
                TextColumn::make('meta.net_sent_usd')
                    ->label('Net payout (NP)')
                    ->money('USD')
                    ->weight('semibold'),
                TextColumn::make('meta.bep20_address')
                    ->label('BEP20 address')
                    ->copyable()
                    ->limit(18)
                    ->tooltip(fn (WalletTransaction $record): ?string => is_array($record->meta)
                        ? ($record->meta['bep20_address'] ?? null)
                        : null),
                TextColumn::make('withdrawal_status')
                    ->label('Status')
                    ->badge()
                    ->state(fn (WalletTransaction $record): string => self::statusLabel($record))
                    ->color(fn (WalletTransaction $record): string => self::statusColor($record)),
                TextColumn::make('meta.nowpayments.payout_id')
                    ->label('NP payout ID')
                    ->placeholder('—')
                    ->copyable()
                    ->toggleable(),
                TextColumn::make('meta.nowpayments.last_status')
                    ->label('NP status')
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('Requested')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'queued' => 'Queued (pay via NP)',
                        'np_creating' => 'NP — awaiting 2FA',
                        'np_processing' => 'NP — processing',
                        'sent' => 'Sent / finished',
                        'failed' => 'Failed',
                        'rejected' => 'Rejected (refunded)',
                    ])
                    ->query(function ($query, array $data) {
                        $value = $data['value'] ?? null;
                        if ($value === null || $value === '') {
                            return $query;
                        }

                        return $query->where('meta->status', $value);
                    }),
            ])
            ->searchPlaceholder('Search user ID, name, email, address…')
            ->emptyStateHeading($payoutsOn
                ? 'No withdrawal requests'
                : 'NOWPayments payouts not configured')
            ->emptyStateDescription($payoutsOn
                ? null
                : 'Set NOWPAYMENTS_PAYOUTS_ENABLED=true and payout email/password in .env, then php artisan config:clear.')
            ->recordActions([
                ...WithdrawalPayoutActions::make(),
                ViewAction::make(),
            ]);
    }

    public static function rawStatus(WalletTransaction $record): string
    {
        $meta = is_array($record->meta) ? $record->meta : [];

        return (string) ($meta['status'] ?? 'queued');
    }

    public static function statusLabel(WalletTransaction $record): string
    {
        return match (self::rawStatus($record)) {
            'queued' => 'Queued → pay via NP',
            'np_creating' => 'NP — verify 2FA',
            'np_processing' => 'NP processing',
            'sent' => 'Sent',
            'failed' => 'Failed',
            'rejected' => 'Rejected',
            default => Str::headline(self::rawStatus($record)),
        };
    }

    public static function statusColor(WalletTransaction $record): string
    {
        return match (self::rawStatus($record)) {
            'queued' => 'warning',
            'np_creating' => 'info',
            'np_processing' => 'primary',
            'sent' => 'success',
            'failed' => 'danger',
            'rejected' => 'gray',
            default => 'gray',
        };
    }
}
