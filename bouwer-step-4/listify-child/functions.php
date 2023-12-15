<?php
/**
 * Listify child theme.
 */
function listify_child_styles() {
    wp_enqueue_style( 'listify-child', get_stylesheet_uri() );
}
add_action( 'wp_enqueue_scripts', 'listify_child_styles', 999 );

/** Place any new code below this line */


/* Start using wellness_blocks */
function render_wellness_block( $atts ) {
    ob_start();

    // Haal de attributen op die worden meegegeven aan de shortcode
    $atts = shortcode_atts( array(
        'ids' => null, // Dit is het ID van de listing die je wilt tonen
    ), $atts, 'wellnessblock' );

    if ( $atts['ids'] ) {
        global $post;

        $post = get_post( $atts['ids'] ); // Haal de listing op met het opgegeven ID
        setup_postdata( $post );

        get_template_part( 'content', 'job_listing_wellnessblock' );

        wp_reset_postdata();
    }

    return ob_get_clean();
}
add_shortcode( 'wellnessblock', 'render_wellness_block' );
/* End using wellness_blocks */



/* Start create input field for wellness_id for affiliate promotions for each listing with post_type of job_listing */

// Add meta boxes to WP editor for listings with post_type job_listing
function add_wellness_id_meta_box() {
    add_meta_box(
        'wellness_id_meta_box', // Meta box ID
        'Wellness ID', // Titel van de meta box
        'show_wellness_id_meta_box', // Callback functie die de HTML voor de meta box genereert
        'job_listing' // Post type
    );
}
add_action('add_meta_boxes', 'add_wellness_id_meta_box');

// Generate HTML for these meta boxes
function show_wellness_id_meta_box($post) {
    $wellness_id = get_post_meta($post->ID, 'wellness_id', true);
    ?>
    <label for="wellness_id">Wellness ID:</label>
    <input type="text" id="wellness_id" name="wellness_id" value="<?php echo $wellness_id; ?>">
    <?php
}

// This saves the meta data
function save_wellness_id_meta_box_data($post_id) {
    if (isset($_POST['wellness_id'])) {
        update_post_meta($post_id, 'wellness_id', $_POST['wellness_id']);
    }
}
add_action('save_post', 'save_wellness_id_meta_box_data');
/* End create input field for wellness_id for affiliate promotions for each listing with post_type of job_listing */





/* Start: include both files from the bundled Svelte App */
// function enqueue_svelte_app() {
// 	$version = '1.3';
//     // Registreer en laad het CSS bestand
//     wp_register_style('svelte_app_css', get_stylesheet_directory_uri() . '/svelte-app/bundle.css?v=' . $version);
//     wp_enqueue_style('svelte_app_css');

//     // Registreer en laad het JS bestand
//     wp_register_script('svelte_app_js', get_stylesheet_directory_uri() . '/svelte-app/bundle.js?v=' . $version, array(), false, true);
//     wp_enqueue_script('svelte_app_js');
// }

// add_action('wp_enqueue_scripts', 'enqueue_svelte_app');
/* End: include both files from the bundled Svelte App */



/* Start of creating shortcodes for promotion-cards & (first) getting/caching the promotions.json data */
function get_all_promotions() {
    // Try to load the transient Wordpress cache for the promotions.json data
    $all_promotions = get_transient('all_promotions');

    // If transient cache for Wordpress is not there, store it for given time as transient cache
    if (false === $all_promotions) {
        $jsonString = file_get_contents(__DIR__ . '/promotions.json');
        $all_promotions = json_decode($jsonString, true);

        // Caching the data
        set_transient('all_promotions', $all_promotions, 2 * MINUTE_IN_SECONDS);
    }
    return $all_promotions;
}

function load_promotion_cards($atts){
    
    $atts = shortcode_atts(array(
        'wellness_id' => ''
    ), $atts);
    
    $wellness_id = $atts['wellness_id'];
    if(!$wellness_id) return '';
    
    $all_promotions = get_all_promotions();
    $filtered_promotions = array_filter($all_promotions, function($promotion) use ($wellness_id) {
        return $promotion['wellnessName'] === $wellness_id;
    });
    
    if (empty($filtered_promotions)) {
        return '';
    }
    
    // $output = "<script>console.log('" . $wellness_id . "');</script>";
    
    include_once 'promotion-cards.php';
    $output = generate_promotion_card($filtered_promotions);
    return $output;
}

add_shortcode('promotion_cards', 'load_promotion_cards');

/* End of creating shortcodes for promotion-cards */
