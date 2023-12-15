<?php
/**
 * The template for displaying a single listing's content.
 *
 * @version 2.0.0
 *
 * @since 2.0.0
 * @package Listify
 */
$wellness_id = get_post_meta( get_the_ID(), 'wellness_id', true);

if(!empty($wellness_id)){
	include('calculate-price-and-discount.php');
	include('campaigns.php');
	
	$jsonString = file_get_contents(__DIR__ . '/promotions.json');
	$all_promotions = json_decode($jsonString, true);
	
	$filtered_promotions = array_filter($all_promotions, function($promotion) use ($wellness_id) {
		return isset($promotion['wellnessName']) && $promotion['wellnessName'] === $wellness_id;
	});
	
	usort($filtered_promotions, fn($a, $b) => strcmp($a['title'], $b['title']));
}

$classes = array(
	'listing-cover',
	'content-single-job_listing-hero',
	'listing-cover--' . get_theme_mod( 'listing-single-hero-overlay-style', 'gradient' ),
	'listing-cover--size-' . get_theme_mod( 'listing-single-hero-size', 'default' ),
	'listing-hero--' . ( get_theme_mod( 'single-listing-secondary-image-display', false ) ? 'company-logo' : 'no-company-logo' ),
);
?>

<script> console.log(<?php echo json_encode($filtered_promotions); ?>) </script>

<div <?php echo apply_filters( 'listify_job_listing_data', '', false ); ?>>

	<div
	<?php
	echo apply_filters(
		'listify_cover',
		implode( ' ', $classes ),
		array(
			'size' => 'full',
		)
	);
	?>
	>

		<?php do_action( 'listify_single_job_listing_cover_start' ); ?>

		<div class="content-single-job_listing-hero-wrapper cover-wrapper container">

			<div class="content-single-job_listing-hero-inner row">

				<div class="content-single-job_listing-hero-company col-md-7 col-sm-12">
					<?php
						/**
						 * Load WP Job Manager's default hooks.
						 *
						 * @hooked single_job_listing_meta_start
						 * @hooked single_job_listing_meta_end
						 * @hooked single_job_listing_meta_after
						 */
						do_action( 'listify_single_job_listing_meta' );
					?>
				</div>

				<div class="content-single-job_listing-hero-actions col-md-5 col-sm-12">
					<?php
						/**
						 * Primary listing actions (contact, reserve, comment, etc).
						 *
						 * @since 1.0.0
						 *
						 * @hooked Listify_WP_Job_Manager_Template_Single_Listing::the_actions()
						 */
						do_action( 'listify_single_job_listing_actions' );
					?>
				</div>

			</div>

		</div>

		<?php do_action( 'listify_single_job_listing_cover_end' ); ?>

	</div>

	<div id="primary" class="container">
		<div class="row content-area">

		<?php if ( get_option( 'job_manager_hide_expired_content', 1 ) && 'expired' === get_post()->post_status ) : ?>

			<div class="woocommerce-message"><?php esc_html_e( 'This listing is expired.', 'listify' ); ?></div>

		<?php else : ?>

			<?php if ( 'left' === esc_attr( listify_theme_mod( 'listing-single-sidebar-position', 'right' ) ) ) : ?>
				<?php get_sidebar( 'single-job_listing' ); ?>
			<?php endif; ?>

			<main id="main" class="site-main col-12 <?php echo esc_attr( 'none' !== esc_attr( listify_theme_mod( 'listing-single-sidebar-position', 'right' ) ) ? 'col-sm-7 col-md-8' : null ); ?>" role="main">
				
				<?php if ( listify_has_integration( 'woocommerce' ) && function_exists('wc_print_notices') ) : ?>
					<?php wc_print_notices(); ?>
				<?php endif; ?>
				
				<?php 
				do_action( 'single_job_listing_start' ); ?>
				
				<?php if( isset($wellness_id) && !empty($wellness_id) && count($filtered_promotions) > 0 ) : ?>
					<div class="widget listify_widget_panel_listing_content">
						<h2><?php echo $wellness_id; ?> korting:</h2>
						<p style="margin-bottom:0px;">Betaal niet te veel voor jouw dagje naar de sauna. Wij zoeken contact naar de laatste kortingen en aanbiedingen. Hieronder vind je de <strong>meest actuele arrangementen en korting voor <?php echo $wellness_id ?>.</strong></p>
						
							<?php 
							include('promotion-cards.php');
							echo generate_promotion_card($filtered_promotions);
							?>
					</div>
				<?php endif; ?>





				
				
				
				<?php
				if ( ! dynamic_sidebar( 'single-job_listing-widget-area' ) ) {
					$defaults = array(
						'before_widget' => '<aside class="widget widget-job_listing">',
						'after_widget'  => '</aside>',
						'before_title'  => '<h3 class="widget-title widget-title-job_listing %s">',
						'after_title'   => '</h3>',
						'widget_id'     => '',
					);
					
					the_widget(
						'Listify_Widget_Listing_Comments',
						array(
							'title' => '',
						),
						$defaults
					);

					the_widget(
						'Listify_Widget_Listing_Map',
						array(
							'title'      => __( 'Listing Location', 'listify' ),
							'icon'       => 'compass',
							'map'        => 1,
							'address'    => 1,
							'phone'      => 1,
							'web'        => 1,
							'email'      => 1,
							'directions' => 1,
						),
						wp_parse_args(
							array(
								'before_widget' => '<aside class="widget widget-job_listing listify_widget_panel_listing_map">',
							),
							$defaults
						)
					);

					the_widget(
						'Listify_Widget_Listing_Video',
						array(
							'title' => __( 'Video', 'listify' ),
							'icon'  => 'ios-film-outline',
						),
						wp_parse_args(
							array(
								'before_widget' => '<aside class="widget widget-job_listing
							listify_widget_panel_listing_video">',
							),
							$defaults
						)
					);

					the_widget(
						'Listify_Widget_Listing_Content',
						array(
							'title' => __( 'Listing Description', 'listify' ),
							'icon'  => 'clipboard',
						),
						wp_parse_args(
							array(
								'before_widget' => '<aside class="widget widget-job_listing listify_widget_panel_listing_content">',
							),
							$defaults
						)
					);
					
				}// End if().
				
				if ( class_exists( 'Extensify' ) && ! dynamic_sidebar( 'single-job_listing-bottom' ) ) {
					dynamic_sidebar( 'single-job_listing-bottom' );
				}
				?>

				<?php do_action( 'single_job_listing_end' ); ?>

			</main>

			<?php if ( 'right' === esc_attr( listify_theme_mod( 'listing-single-sidebar-position', 'right' ) ) ) : ?>
				<?php get_sidebar( 'single-job_listing' ); ?>
			<?php endif; ?>

		<?php endif; ?>
		</div>
	</div>
</div>