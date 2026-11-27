<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class CashierOrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ["cashier", "admin", "owner"], true)) {
            return response()->json(["status" => "error", "message" => "Tidak diizinkan."], 403);
        }
        $status = $request->query("status");
        $search = trim((string) $request->query("search", ""));
        $dateFrom = $request->query("date_from");
        $dateTo = $request->query("date_to");
        $query = Order::with(["user:user_id,name", "items.product:product_id,name,image,price"])->orderBy("created_at", "desc");
        if ($search !== "") {
            $query->where(function ($builder) use ($search) {
                $builder->where("customer_name", "like", "%{$search}%")
                    ->orWhere("order_id", is_numeric($search) ? (int) $search : -1);
            });
        }
        if ($dateFrom) {
            $query->whereDate("created_at", ">=", $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate("created_at", "<=", $dateTo);
        }
        if ($status === "unconfirmed") {
            $query->whereIn("status", ["pending", "paid"]);
        } elseif ($status === "processing") {
            $query->where("status", "processing")->where("payment_status", "paid");
        } elseif ($status === "done") {
            $query->whereIn("status", ["completed", "cancelled", "refunded"]);
        }
        $orders = $query->get()->map(function($o) {
            return [
                "id"                => $o->order_id,
                "order_id"          => $o->order_id,
                "customer_name"     => $o->customer_name,
                "phone"             => $o->phone,
                "address"           => $o->address,
                "courier"           => $o->courier,
                "total_price"       => $o->total_price,
                "discount"          => (int)$o->discount,
                "points_used"       => (int)$o->points_used,
                "points_discount"   => (int)$o->points_discount,
                "status"            => $o->status,
                "payment_status"    => $o->payment_status,
                "payment_mode"      => $o->payment_mode,
                "payment_method"    => $o->payment_method,
                "payment_type"      => $o->payment_type,
                "paid_at"           => $o->paid_at,
                "pickup_at"         => $o->pickup_at,
                "pickup_deadline"   => $o->pickup_deadline,
                "created_at"        => $o->created_at,
                "transaction_at"    => $o->paid_at ?: $o->created_at,
                "cashier_name"      => $o->user?->name,
                "source_label"      => ($o->payment_mode === "online" || !$o->user || $o->user->role === "user")
                    ? "Aplikasi Online"
                    : "Kasir: " . $o->user->name,
                "midtrans_order_id" => $o->midtrans_order_id,
                "items"             => $o->items->map(function($item) {
                    return [
                        "id"         => $item->id,
                        "product_id" => $item->product_id,
                        "qty"        => $item->qty,
                        "price"      => $item->price,
                        "total"      => $item->total,
                        "product"    => $item->product ? [
                            "id"    => $item->product->id,
                            "name"  => $item->product->name,
                            "price" => $item->product->price,
                            "image" => $item->product->image,
                        ] : null
                    ];
                })
            ];
        });
        return response()->json(["status" => "success", "data" => $orders]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ["cashier", "admin", "owner"], true)) {
            return response()->json(["status" => "error", "message" => "Tidak diizinkan."], 403);
        }
        $data = $request->all();
        $id = (int)($data["id"] ?? 0);
        $status = trim($data["status"] ?? "");
        $paymentMethod = trim((string)($data["payment_method"] ?? ""));
        $allowed = ["pending", "processing", "paid", "completed", "cancelled", "refunded"];
        if (!in_array($status, $allowed, true)) {
            return response()->json(["status" => "error", "message" => "Status transaksi tidak valid."], 422);
        }
        $order = Order::find($id);
        if (!$order) {
            return response()->json(["status" => "error", "message" => "Transaksi tidak ditemukan."], 404);
        }
        if ($status === "paid" && $order->payment_status !== "paid") {
            if ($paymentMethod !== "" && !in_array($paymentMethod, ["cash", "qris", "debit"], true)) {
                return response()->json(["status" => "error", "message" => "Metode pembayaran tidak valid."], 422);
            }
            if ($paymentMethod === "cash" && (int)($data["cash_received"] ?? 0) < (int)$order->total_price) {
                return response()->json(["status" => "error", "message" => "Uang diterima belum mencukupi total transaksi."], 422);
            }
        }
        $order->update(["status" => $status]);
        if ($status === "paid" && $order->payment_status !== "paid") {
            $order->update(["payment_status" => "paid", "payment_mode" => $order->payment_mode ?: "cash", "payment_method" => $paymentMethod ?: ($order->payment_method ?: "manual"), "payment_type" => $paymentMethod ?: ($order->payment_type ?: "manual"), "paid_at" => now()]);
            try {
                app(\App\Services\StoreNotifier::class)->orderPaid($order);
                app(\App\Services\LoyaltyService::class)->awardForOrder($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Gagal kirim notifikasi: " . $e->getMessage());
            }
        }
        if ($status === "cancelled" && $order->payment_status !== "paid") {
            $order->update(["payment_status" => "cancelled"]);
            $order->releaseItemsStock();
            try {
                app(\App\Services\LoyaltyService::class)->refundForOrder($order);
            } catch (\Throwable $e) {
            }
            if ($status === "refunded" && $order->payment_status === "paid") {
                $order->update(["payment_status" => "refunded"]);
            }
        }
        return response()->json(["status" => "success", "message" => "Status berhasil diperbarui.", "order" => ["id" => $order->id, "status" => $order->status, "payment_status" => $order->payment_status, "payment_mode" => $order->payment_mode, "payment_method" => $order->payment_method, "paid_at" => $order->paid_at]]);
    }

    public function count(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ["cashier", "admin", "owner"], true)) {
            return response()->json(["status" => "error", "message" => "Tidak diizinkan."], 403);
        }
        $count = Order::whereIn("status", ["pending", "paid"])->count();
        return response()->json(["status" => "success", "count" => $count]);
    }
}
