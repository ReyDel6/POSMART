<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductDetailTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create(['name' => 'Admin', 'email' => 'admin@t.dev', 'password' => 'password', 'role' => 'admin']);
    }

    private function base(array $overrides = []): array
    {
        return array_merge([
            'barcode' => 'DTL-' . random_int(100000, 999999),
            'name'    => 'Produk Lengkap',
            'price'   => 15000,
            'category'=> 'Food',
            'stock'   => 10,
            'image'   => 'main.jpg',
        ], $overrides);
    }

    public function test_admin_can_store_description_and_gallery(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $payload = $this->base([
            'barcode'     => 'DTL-STORE-' . random_int(100000, 999999),
            'description' => 'Deskripsi produk menarik.',
            'gallery'     => ['foto1.jpg', 'foto2.jpg', 'foto3.jpg'],
        ]);

        $this->postJson('/admin/products.php', $payload)
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $product = Product::where('barcode', $payload['barcode'])->first();

        $this->assertNotNull($product);
        $this->assertSame('Deskripsi produk menarik.', $product->description);
        $this->assertSame(['foto1.jpg', 'foto2.jpg', 'foto3.jpg'], $product->gallery);
    }

    public function test_admin_sanitizes_gallery(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $payload = [
            'barcode'   => 'DTL-' . random_int(100000, 999999),
            'name'      => 'Produk Galeri',
            'price'     => 1000,
            'category'  => 'Food',
            'stock'     => 5,
            'image'     => 'main.jpg',
            // 12 item -> hanya yang valid dan maksimal 8 yang disimpan
            'gallery'   => [
                'a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg', 'f.jpg', 'g.jpg', 'h.jpg',
                'i.jpg', 'j.jpg', 'noext', '../naik.jpg', 'inilah.jpg',
                'duplicate.jpg', 'duplicate.jpg', '',
            ],
        ];

        $this->postJson('/admin/products.php', $payload)
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $product = Product::where('barcode', $payload['barcode'])->first();
        $this->assertNotNull($product);

        // 'noext', '../naik.jpg', dan '' dibuang; duplikat di-unique; max 8 disimpan
        $this->assertCount(8, $product->gallery);
        $this->assertNotContains('noext', $product->gallery);
        $this->assertNotContains('../naik.jpg', $product->gallery);
        $this->assertSame(count($product->gallery), count(array_unique($product->gallery)));
    }

    public function test_detail_endpoint_returns_description_gallery_and_reviews(): void
    {
        $product = Product::create($this->base([
            'description' => 'Isi kemasan 250ml.',
            'gallery'     => ['satu.jpg', 'dua.jpg'],
        ]));

        $response = $this->getJson('/get.product.php?id=' . $product->id);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.description', 'Isi kemasan 250ml.')
            ->assertJsonPath('data.gallery', ['/product/satu.jpg', '/product/dua.jpg'])
            ->assertJsonPath('data.reviews_count', 0)
            ->assertJsonPath('data.can_review', false);

        $json = $response->json('data');
        $this->assertArrayHasKey('rating', $json);
        $this->assertArrayHasKey('reviews', $json);
        $this->assertArrayHasKey('my_rating', $json);
    }

    public function test_product_not_found_returns_error(): void
    {
        $this->getJson('/get.product.php?id=999999')
            ->assertStatus(404)
            ->assertJsonPath('status', 'error');
    }
}