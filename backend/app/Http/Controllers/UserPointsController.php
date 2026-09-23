<?php

namespace App\Http\Controllers;

use App\Services\LoyaltyService;
use Illuminate\Http\Request;

class UserPointsController extends Controller
{
    public function index(Request $request, LoyaltyService $loyalty)
    {
        $user = $request->user();

        $ledger = $user->points()
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(30)
            ->get()
            ->map(function ($p) {
                return [
                    'id'          => $p->id,
                    'amount'      => (int) $p->amount,
                    'type'        => $p->type,
                    'description' => $p->description,
                    'order_id'    => $p->order_id ? (int) $p->order_id : null,
                    'created_at'  => $p->created_at,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => [
                'points'      => (int) $user->points,
                'earning_rate'=> $loyalty->earningRate(),
                'redeem_rate' => $loyalty->redeemRate(),
                'ledger'      => $ledger,
            ],
        ]);
    }
}