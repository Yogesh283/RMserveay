<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'surveys_member_tier_index';

    public function up(): void
    {
        if (! Schema::hasTable('surveys')) {
            return;
        }

        if (! Schema::hasColumn('surveys', 'member_tier')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->string('member_tier', 32)->default('free')->after('status');
            });
        }

        if (! Schema::hasColumn('surveys', 'member_tier')) {
            return;
        }

        if ($this->indexExists('surveys', self::INDEX_NAME)) {
            return;
        }

        Schema::table('surveys', function (Blueprint $table) {
            $table->index('member_tier');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('surveys')) {
            return;
        }

        if (Schema::hasColumn('surveys', 'member_tier')) {
            if ($this->indexExists('surveys', self::INDEX_NAME)) {
                Schema::table('surveys', function (Blueprint $table) {
                    $table->dropIndex(['member_tier']);
                });
            }

            Schema::table('surveys', function (Blueprint $table) {
                $table->dropColumn('member_tier');
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $rows = DB::select(
                'SHOW INDEX FROM `'.$table.'` WHERE Key_name = ?',
                [$indexName]
            );

            return count($rows) > 0;
        }

        if ($driver === 'sqlite') {
            $rows = DB::select(
                'SELECT 1 FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1',
                ['index', $indexName]
            );

            return count($rows) > 0;
        }

        if ($driver === 'pgsql') {
            $schema = Schema::getConnection()->getConfig('schema') ?? 'public';
            $rows = DB::select(
                'SELECT 1 FROM pg_indexes WHERE schemaname = ? AND tablename = ? AND indexname = ? LIMIT 1',
                [$schema, $table, $indexName]
            );

            return count($rows) > 0;
        }

        return false;
    }
};
