<?php
$listing_id = get_the_ID();

if ( ! $listing_id ) {
    return;
}

$all_meta_data = get_post_meta( $listing_id );


$permalink = get_permalink( $listing_id );
$title = get_the_title( $listing_id );
$featured_image_url = get_the_post_thumbnail_url( $listing_id, 'large' );
$geolocation_state_long = get_post_meta( $listing_id, 'geolocation_state_long', true );
$geolocation_state_short = get_post_meta( $listing_id, 'geolocation_state_short', true );
$location = $geolocation_state_long . " (" . $geolocation_state_short . ")";
$telephone = get_post_meta( $listing_id, '_phone', true );
$average_rating = get_post_meta( $listing_id, '_average_rating', true );
$author_id = get_post_field( 'post_author', $listing_id );
$author_avatar_url = get_avatar_url($author_id, ['size' => 150]);

$full_stars = floor($average_rating);
if ($average_rating - $full_stars > 0.24 && $average_rating - $full_stars < 0.76) {
    $half_stars = 1;
} else {
    $half_stars = 0;
}
$empty_stars = 5 - $full_stars - $half_stars;

?>


<div id="listify_widget_recent_listings-1">
	<ul class="job_listings listing-cards-anchor--active" data-card-columns="1">
	
<li id="listing-<?php echo esc_attr( $listing_id ); ?>" class="job_listing type-job_listing card-style--default style-grid listing-card job_position_featured listing-featured--outline">
    <div class="content-box">

        <a href="<?php echo esc_url( $permalink ); ?>" class="job_listing-clickbox"></a>

        <header class="job_listing-entry-header listing-cover has-image" style="background-image:url(<?php echo esc_url( $featured_image_url ); ?>)">
            <div class="job_listing-entry-header-wrapper cover-wrapper">
                <div class="job_listing-entry-meta">
                    <h3 class="job_listing-title"><?php echo esc_html( $title ); ?></h3>
                    <div class="job_listing-location"><?php echo esc_html( $location ); ?></div>
                    <div class="job_listing-phone"><?php echo esc_html( $telephone ); ?></div>
                </div>
            </div>
        </header>

			

        <footer class="job_listing-entry-footer">
            <div class="listing-stars">
                <?php
					for ($i = 1; $i <= $full_stars; $i++) {
						echo '<span class="listing-star listing-star--full"></span>';
					}

					for ($i = 1; $i <= $half_stars; $i++) {
						echo '<span class="listing-star listing-star--half"></span>';
					}

					for ($i = 1; $i <= $empty_stars; $i++) {
						echo '<span class="listing-star listing-star--empty"></span>';
					}
					?>
            </div>

            <div class="listing-entry-company-image listing-entry-company-image--card listing-entry-company-image--type-avatar listing-entry-company-image--style-circle">
                <a href="<?php echo get_author_posts_url($author_id); ?>">
                    <img class="listing-entry-company-image__img listing-entry-company-image__img--type-logo listing-entry-company-image__img--style-circle" src="<?php echo esc_url($author_avatar_url); ?>" alt="<?php echo esc_attr($title); ?>">
                </a>
            </div>
        </footer>

    </div>
	</li>
	</ul>
</div>