<?php

namespace Tests\Feature;

use App\Mail\NewOrderForStoreMail;
use App\Mail\OrderConfirmMail;
use App\Mail\OrderPaidMail;
use App\Mail\PasswordResetMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'buyer@t.dev', string $role = 'user'): User
    {
        return User::create(['name' => 'Buyer', 'email' => $email, 'password' => 'password', 'role' => $role]);
    }

    private function product(): Product
    {
        return Product::create([
            'barcode' => 'NOT-' . random_int(100000, 999999),
            'name'    => 'Produk Notif',
            'price'   => 8000,
            'category'=> 'Food',
            'stock'   => 10,
            'image'   => 'placeholder.jpg',
        ]);
    }

    private function makeOrder(User $user, Product $product): Order
    {
        Sanctum::actingAs($user);

        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Notif 1',
            'courier'       => 'regular',
            'items'         => [['id' => $product->id, 'qty' => 1]],
        ])->assertStatus(201);

        return Order::where('user_id', $user->id)->first();
    }

    public function test_order_created_sends_confirm_and_store_email_when_configured(): void
    {
        Mail::fake();

        Setting::create(['key' => 'store_name', 'value' => 'Toko Test']);
        Setting::create(['key' => 'store_email', 'value' => 'toko@t.dev']);

        $user    = $this->user();
        $product = $this->product();

        $this->makeOrder($user, $product);

        Mail::assertSent(OrderConfirmMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        Mail::assertSent(NewOrderForStoreMail::class, function ($mail) {
            return $mail->hasTo('toko@t.dev');
        });
    }

    public function test_store_email_not_sent_when_not_configured(): void
    {
        Mail::fake();

        $user    = $this->user();
        $product = $this->product();

        $this->makeOrder($user, $product);

        Mail::assertSent(OrderConfirmMail::class);
        Mail::assertNotSent(NewOrderForStoreMail::class);
    }

    public function test_paid_order_sends_order_paid_email(): void
    {
        Mail::fake();

        $user    = $this->user();
        $product = $this->product();
        $order   = $this->makeOrder($user, $product);

        // Simulasikan transisi pending -> paid lewat mark-paid admin
        $admin = $this->user('admin@t.dev', 'admin');
        Sanctum::actingAs($admin);

        $this->putJson('/admin/orders.php', ['id' => $order->id, 'status' => 'paid'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        Mail::assertSent(OrderPaidMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_forgot_password_sends_reset_link_email(): void
    {
        Mail::fake();

        Setting::create(['key' => 'store_name', 'value' => 'POSMart Test']);
        $user = $this->user('lupa@t.dev');

        $this->postJson('/user/forgot-password.php', ['email' => 'lupa@t.dev'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        Mail::assertSent(PasswordResetMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }
}