<?php 


function generate_promotion_card($filtered_promotions) {
    //use include, instead of include_once, since variables will be created in local scope and will be overwritten/updates with every new include
    include('campaigns.php');
    //use include_once, since it otherwise gives an error with the next call from the shortcode. function names cannot be included again
    include_once('calculate-price-and-discount.php');
    
    $output = '';
    foreach ($filtered_promotions as $promotion) {

        $output .= "<a href=\"{$promotion['url']}\" target=\"_blank\">";
        $output .= "<div class=\"promotion\">";
        $output .= "<div class=\"promotion-body\">";
        $output .= "<div class=\"logo\"><img src=\"{$campaigns[$promotion['campaignID']]['image']}\" alt=\"{$campaigns[$promotion['campaignID']]['name']}\" /></div>";
        $output .= "<div class=\"promotion-info\">";
        $output .= "<h5 class=\"promotion-title\">{$promotion['title']}</h5>";
        $output .= "<div class=\"extra-info\">";

        // if (isset($promotion['location']) && !empty($promotion['location'])) {
        //     $locationValue = is_array($promotion['location']) ? $promotion['location'][0] : $promotion['location'];
        //     if (preg_match('/\|/', $locationValue)) {
        //         $locationValue = preg_replace('/\|.*/', '', $locationValue);
        //     }
        //     if (!empty($locationValue)) {
        //         $output .= "<p class=\"promotion-location\">{$locationValue}</p>";
        //     }
        // }

        list($oldPrice, $newPrice, $discount) = calculatePriceAndDiscount($promotion['campaignID'], $promotion['oldPrice'], $promotion['newPrice'], $promotion['discount']);

        $output .= "<div class=\"price-info\">";
        $output .= "<div class=\"new-discount\">";
        $output .= "<div class=\"old\"" . ($oldPrice == "€0,-" ? " hidden" : "") . ">{$oldPrice}</div>";
        $output .= "<div class=\"new\"" . ($discount ? " style=\"background-color: transparent\"" : "") . ">{$newPrice}</div>";
        $output .= "</div>"; 
        $output .= "<div class=\"discount" . (!$discount || $oldPrice == "€0,-" ? " hidden" : "") . "\">{$discount}</div>";
        $output .= "</div>";
        $output .= "</div>"; // Einde van extra-info
        $output .= "</div>"; // Einde van promotion-info
        $output .= "<div class=\"cta\">";
        $output .= "<button><span>Bekijk actie</span></button>";
        $output .= "<img src=\"https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/pijl2.png\" alt=\"Call to action pijl\"/>";
        $output .= "</div>"; // Einde van cta
        $output .= "</div>"; // Einde van promotion-body
        $output .= "</div>"; // Einde van promotion
        $output .= "</a>";
    }

    return $output;
}



?>