<?php
    function calculatePriceAndDiscount($campaignID, $oldPrice = null, $newPrice = null, $discount = null) {
    
        if (in_array($campaignID, [4179, 8308]) && ($newPrice == 1 || $newPrice == 0)) {
            $newPrice = "v.a. €1,-";
        }
        
        if (in_array($campaignID, [11136, 10456, 26224, 13048, 686, 2301])) {
            if ($oldPrice !== null && $newPrice !== null) {
                $discount .= '% korting!';
                $oldPrice = "€" . number_format($oldPrice, 2, ',', '.');
                $newPrice = "€" . number_format($newPrice, 2, ',', '.');
            } elseif ($newPrice !== null) {
                $newPrice = "€" . number_format($newPrice, 2, ',', '.');
            }
        }
    
        return [$oldPrice, $newPrice, $discount];
    }
?>
