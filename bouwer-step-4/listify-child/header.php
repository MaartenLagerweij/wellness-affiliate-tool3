<?php
/**
 * The Header for our theme.
 *
 * Displays all of the <head> section and everything up till <div id="content">
 *
 * @package Listify
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<link rel="profile" href="http://gmpg.org/xfn/11">
	<link rel="pingback" href="<?php bloginfo( 'pingback_url' ); ?>">
	
	<link rel='stylesheet' href='https://wellnesscentrumnederland.nl/wp-content/themes/listify-child/font-awesome/regular.css'/>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-4bw+/aepP/YC94hEpVNVgiZdgIC5+VKNBQNGCHeKRQN+PtmoHDEXuppvnDJzQIu9" crossorigin="anonymous">
	
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div id="page" class="hfeed site">

	<header id="masthead" class="<?php echo esc_attr( is_front_page() ? 'site-header site-header--' . get_theme_mod( 'home-header-style', 'default' ) : 'site-header' ); ?>">
		<div class="primary-header">
			<div class="container">
				<div class="primary-header-inner">
					<div class="site-branding">
						<?php echo listify_partial_site_branding(); ?>
					</div>

					<div class="primary nav-menu">
						<?php
							$listify_new_skin = get_theme_mod( 'color-scheme' );	
							if ( listify_theme_mod( 'nav-secondary', true ) && isset($listify_new_skin) && $listify_new_skin == "listify-new-skin" ) {
								wp_nav_menu(
									array(
										'theme_location'  => 'secondary',
										'container_class' => 'secondary nav-menu',
										'menu_class'      => 'secondary nav-menu',
									)
								);
							}
							wp_nav_menu(
								array(
									'theme_location'  => 'primary',
									'container_class' => 'nav-menu-container',
								)
							);
							if ( isset($listify_new_skin) && $listify_new_skin == "listify-new-skin" ) {
								$hide = get_theme_mod( 'header-button-display' );
								$explore_btn = get_theme_mod( 'header-button-text' );
								if( $hide == true && !empty($explore_btn) ){
								?>							
									<a href="<?php echo get_theme_mod( 'header-button-url' ); ?>"  class="explore-button">
										<?php echo get_theme_mod( 'header-button-text' ) ?? "explore"; ?>
									</a>
							<?php } ?>				
						<?php } ?>				
					</div>
				</div>

				<?php if ( get_theme_mod( 'nav-search', true ) ) : ?>
				<div id="search-header" class="search-overlay">
					<div class="container">
						<?php locate_template( array( 'searchform-header.php', 'searchform.php' ), true, false ); ?>
						<a href="#search-header" data-toggle="#search-header" class="ion-close search-overlay-toggle"></a>
					</div>
				</div>
				<?php endif; ?>
			</div>
		</div>

		
	</header><!-- #masthead -->
	
<!-- 	Put the <nav></nav> below outside of the <header></header> in order to make this one sticky -->
	<nav id="site-navigation" class="main-navigation
		<?php
		if ( is_front_page() ) :
			?>
 main-navigation--<?php echo get_theme_mod( 'home-header-style', 'default' ); ?><?php endif; ?>">
			<div class="container">
				<a href="#" class="navigation-bar-toggle">
					<i class="ion-navicon-round"></i>
					<span class="mobile-nav-menu-label"><?php echo listify_get_theme_menu_name( 'primary' ); ?></span>
				</a>

				<div class="navigation-bar-wrapper">
					<?php
						wp_nav_menu(
							array(
								'theme_location'  => 'primary',
								'container_class' => 'primary nav-menu',
								'menu_class'      => 'primary nav-menu',
							)
						);
						if ( listify_theme_mod( 'nav-secondary', true ) ) {
							wp_nav_menu(
								array(
									'theme_location'  => 'secondary',
									'container_class' => 'secondary nav-menu',
									'menu_class'      => 'secondary nav-menu',
								)
							);
						}
					?>
				</div>

				<?php if ( 'none' !== get_theme_mod( 'nav-search', 'left' ) ) : ?>
					<a href="#search-navigation" data-toggle="#search-navigation" class="ion-search search-overlay-toggle"></a>

					<div id="search-navigation" class="search-overlay">
						<?php locate_template( array( 'searchform-header.php', 'searchform.php' ), true, false ); ?>

						<a href="#search-navigation" data-toggle="#search-navigation" class="ion-close search-overlay-toggle"></a>
					</div>
				<?php endif; ?>
			</div>
		</nav><!-- #site-navigation -->

	<?php do_action( 'listify_content_before' ); ?>

	<div id="content" class="site-content">
