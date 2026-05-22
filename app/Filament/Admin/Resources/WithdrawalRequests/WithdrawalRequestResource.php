<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests;

use App\Filament\Admin\Resources\WithdrawalRequests\Pages\ListWithdrawalRequests;
use App\Filament\Admin\Resources\WithdrawalRequests\Pages\ViewWithdrawalRequest;
use App\Filament\Admin\Resources\WithdrawalRequests\Schemas\WithdrawalRequestInfolist;
use App\Filament\Admin\Resources\WithdrawalRequests\Tables\WithdrawalRequestsTable;
use App\Models\WalletTransaction;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class WithdrawalRequestResource extends Resource
{
    protected static ?string $model = WalletTransaction::class;

    protected static ?string $navigationLabel = 'Withdrawals → NOWPayments';

    protected static ?string $modelLabel = 'withdrawal request';

    protected static ?string $pluralModelLabel = 'withdrawal requests';

    protected static string|UnitEnum|null $navigationGroup = 'Wallet';

    protected static ?int $navigationSort = 1;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArrowUpTray;

    public static function getNavigationBadge(): ?string
    {
        $count = static::getEloquentQuery()
            ->where(function (Builder $q): void {
                $q->where('meta->status', 'queued')
                    ->orWhereNull('meta->status');
            })
            ->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): string|array|null
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function infolist(Schema $schema): Schema
    {
        return WithdrawalRequestInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return WithdrawalRequestsTable::configure($table);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->where('type', WalletTransaction::TYPE_WITHDRAWAL)
            ->with('user:id,login_uid,name,email,phone');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListWithdrawalRequests::route('/'),
            'view' => ViewWithdrawalRequest::route('/{record}'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }
}
