<?php

namespace App\Filament\Admin\Pages;

use App\Filament\Admin\Support\AdminTeamLegCheckHelper;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\View;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use UnitEnum;

class CheckTeamPage extends Page
{
    protected static ?string $slug = 'check-team';

    protected static ?string $navigationLabel = 'Check team';

    protected static ?string $title = 'Check team';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static string|UnitEnum|null $navigationGroup = 'System';

    protected static ?int $navigationSort = 55;

    /** @var array<string, mixed> */
    public array $report = [];

    public bool $checked = false;

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Check team')
                    ->description(
                        'Enter a user ID or login UID to see left/right binary leg totals for active, sub, and super panels — same logic as member My Team and admin SQL.'
                    )
                    ->icon(Heroicon::OutlinedUserGroup)
                    ->headerActions([
                        Action::make('runCheckTeam')
                            ->label('Look up user')
                            ->icon(Heroicon::OutlinedMagnifyingGlass)
                            ->color('primary')
                            ->schema([
                                TextInput::make('user_lookup')
                                    ->label('User ID or login UID')
                                    ->placeholder('157 or vkd')
                                    ->required()
                                    ->maxLength(64),
                            ])
                            ->action(function (array $data): void {
                                $lookup = (string) ($data['user_lookup'] ?? '');
                                $report = AdminTeamLegCheckHelper::build($lookup);

                                if ($report === null) {
                                    $this->checked = false;
                                    $this->report = [];
                                    Notification::make()
                                        ->title('User not found')
                                        ->body('No user for: '.$lookup)
                                        ->danger()
                                        ->send();

                                    return;
                                }

                                $this->report = $report;
                                $this->checked = true;
                            }),
                    ])
                    ->schema([
                        View::make('filament.admin.pages.check-team')
                            ->viewData(fn (): array => [
                                'report' => $this->report,
                                'checked' => $this->checked,
                            ]),
                    ]),
            ]);
    }
}
