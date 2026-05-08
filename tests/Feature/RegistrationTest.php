<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_json(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $email = 'register-test-'.uniqid('', true).'@example.com';

        $response = $this->postJson('/api/register', [
            'user_type' => 'normal',
            'login_uid' => 'reg'.strtolower(substr(md5((string) microtime(true)), 0, 8)),
            'name' => 'Register Test',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', $email)
            ->assertJsonPath('user.name', 'Register Test');

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'Register Test',
        ]);
    }

    public function test_referral_register_places_inside_requested_leg_when_root_slot_is_full(): void
    {
        config(['otp.bypass' => true]);
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $sponsor = User::factory()->create([
            'referral_code' => 'SPONSOR1',
        ]);
        $firstLeft = User::factory()->create([
            'sponsor_id' => $sponsor->id,
            'binary_parent_id' => $sponsor->id,
            'binary_side' => 'left',
        ]);
        $sponsor->forceFill(['left_child_id' => $firstLeft->id])->save();

        $response = $this->postJson('/api/register', [
            'user_type' => 'normal',
            'login_uid' => 'leftlegoverflow',
            'name' => 'Left Leg Overflow',
            'email' => 'left-leg-overflow@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'sponsor_referral_code' => 'SPONSOR1',
            'binary_side' => 'left',
        ]);

        $response->assertCreated();

        $newUser = User::where('login_uid', 'leftlegoverflow')->firstOrFail();
        $this->assertSame($sponsor->id, $newUser->sponsor_id);
        $this->assertSame($firstLeft->id, $newUser->binary_parent_id);
        $this->assertSame('left', $newUser->binary_side);
        $this->assertSame($newUser->id, $firstLeft->fresh()->left_child_id);
        $this->assertSame($firstLeft->id, $sponsor->fresh()->left_child_id);
    }

    public function test_extreme_left_placement_walks_down_left_chain_and_ignores_empty_right_slots(): void
    {
        config(['otp.bypass' => true]);
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $sponsor = User::factory()->create(['referral_code' => 'SPONSOREL']);

        /** Deep left chain: sponsor → A → B (B has no children). Sponsor and A both have empty right slots. */
        $a = User::factory()->create([
            'sponsor_id' => $sponsor->id,
            'binary_parent_id' => $sponsor->id,
            'binary_side' => 'left',
        ]);
        $b = User::factory()->create([
            'sponsor_id' => $sponsor->id,
            'binary_parent_id' => $a->id,
            'binary_side' => 'left',
        ]);
        $sponsor->forceFill(['left_child_id' => $a->id])->save();
        $a->forceFill(['left_child_id' => $b->id])->save();

        $response = $this->postJson('/api/register', [
            'user_type' => 'normal',
            'login_uid' => 'extremeleft1',
            'name' => 'Extreme Left',
            'email' => 'extreme-left@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'sponsor_referral_code' => 'SPONSOREL',
            'binary_side' => 'left',
        ]);
        $response->assertCreated();

        $newUser = User::where('login_uid', 'extremeleft1')->firstOrFail();

        /** Goes deeper on left, NOT to sponsor.right_child or A.right_child. */
        $this->assertSame($b->id, $newUser->binary_parent_id, 'extreme-left should keep walking down left_child_id chain.');
        $this->assertSame('left', $newUser->binary_side);
        $this->assertSame($newUser->id, $b->fresh()->left_child_id);
        $this->assertNull($sponsor->fresh()->right_child_id, 'sponsor.right_child must remain empty under extreme-left.');
        $this->assertNull($a->fresh()->right_child_id, 'A.right_child must remain empty under extreme-left.');
    }

    public function test_extreme_right_placement_walks_down_right_chain_and_ignores_empty_left_slots(): void
    {
        config(['otp.bypass' => true]);
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $sponsor = User::factory()->create(['referral_code' => 'SPONSORER']);

        /** Deep right chain: sponsor → A → B. Sponsor and A both have empty left slots. */
        $a = User::factory()->create([
            'sponsor_id' => $sponsor->id,
            'binary_parent_id' => $sponsor->id,
            'binary_side' => 'right',
        ]);
        $b = User::factory()->create([
            'sponsor_id' => $sponsor->id,
            'binary_parent_id' => $a->id,
            'binary_side' => 'right',
        ]);
        $sponsor->forceFill(['right_child_id' => $a->id])->save();
        $a->forceFill(['right_child_id' => $b->id])->save();

        $response = $this->postJson('/api/register', [
            'user_type' => 'normal',
            'login_uid' => 'extremeright1',
            'name' => 'Extreme Right',
            'email' => 'extreme-right@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'sponsor_referral_code' => 'SPONSORER',
            'binary_side' => 'right',
        ]);
        $response->assertCreated();

        $newUser = User::where('login_uid', 'extremeright1')->firstOrFail();

        $this->assertSame($b->id, $newUser->binary_parent_id, 'extreme-right should keep walking down right_child_id chain.');
        $this->assertSame('right', $newUser->binary_side);
        $this->assertSame($newUser->id, $b->fresh()->right_child_id);
        $this->assertNull($sponsor->fresh()->left_child_id, 'sponsor.left_child must remain empty under extreme-right.');
        $this->assertNull($a->fresh()->left_child_id, 'A.left_child must remain empty under extreme-right.');
    }
}
