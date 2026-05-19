<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\WalletTransaction;
use App\Support\AdminDashboardTodayMetrics;
use App\Support\BinaryClosingCalendar;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;

class TodayDepositsWidget extends TableWidget
{
    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    public function getTableHeading(): ?string
    {
        $tz = BinaryClosingCalendar::timezone();
        $date = BinaryClosingCalendar::todayDateString();
        $deposits = AdminDashboardTodayMetrics::todayDeposits();

        return "Today deposits ({$deposits['count']} · \$".number_format($deposits['total_usd'], 2).") · {$date} · {$tz}";
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => $this->getTableQuery())
            ->columns([
                TextColumn::make('user.login_uid')
                    ->label('User ID')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—'),
                TextColumn::make('user.name')
                    ->label('Name')
                    ->searchable(),
                TextColumn::make('user.email')
                    ->label('Email')
                    ->toggleable(),
                TextColumn::make('amount')
                    ->label('Amount (USD)')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('balance_after')
                    ->label('Balance after')
                    ->money('USD')
                    ->toggleable(),
                TextColumn::make('meta')
                    ->label('Note')
                    ->formatStateUsing(fn ($state) => is_array($state) ? json_encode($state) : ($state ?? '—'))
                    ->limit(40)
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label('Deposit time')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No deposits today')
            ->paginated([10, 25, 50])
            ->recordUrl(fn (WalletTransaction $record) => $record->user
                ? UserResource::getUrl('view', ['record' => $record->user])
                : null);
    }

    protected function getTableQuery(): Builder
    {
        [$start, $end] = AdminDashboardTodayMetrics::todayBounds();

        return WalletTransaction::query()
            ->with('user:id,login_uid,name,email')
            ->where('type', WalletTransaction::TYPE_DEPOSIT_CREDIT)
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('created_at');
    }
}
