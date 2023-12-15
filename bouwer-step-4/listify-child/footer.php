<?php
/**
 * The template for displaying the footer.
 *
 * Contains the closing of the #content div and all content after
 *
 * @package Listify
 */
?>
	</div><!-- #content -->

</div><!-- #page -->

<div class="footer-wrapper">

	<?php if ( ! listify_is_job_manager_archive() ) : ?>

		<?php get_template_part( 'content', 'aso' ); ?>

		<?php if ( is_active_sidebar( 'widget-area-footer-1' ) || is_active_sidebar( 'widget-area-footer-2' ) || is_active_sidebar( 'widget-area-footer-3' ) ) : ?>

			<footer class="site-footer-widgets">
				<?php if ( is_active_sidebar( 'widget-area-pre-footer' ) ) : ?>
					<div class="footer-widget-column col-12 col-sm-12 col-lg-5">
						<?php dynamic_sidebar( 'widget-area-pre-footer' ); ?>
					</div>
				<?php endif; ?>
				<div class="container">
					<div class="row">

						<div class="footer-widget-column col-12 col-sm-12 col-lg-5">
							<?php dynamic_sidebar( 'widget-area-footer-1' ); ?>
						</div>

						<div class="footer-widget-column col-12 col-sm-6 col-lg-3 offset-lg-1">
							<?php dynamic_sidebar( 'widget-area-footer-2' ); ?>
						</div>

						<div class="footer-widget-column col-12 col-sm-6 col-lg-3">
							<?php dynamic_sidebar( 'widget-area-footer-3' ); ?>
						</div>

					</div>
				</div>
			</footer>
		
		<?php endif; ?>

	<?php endif; ?>

	<footer id="colophon" class="site-footer">
		<div class="container">

			<div class="site-info">
				<?php echo listify_partial_copyright_text(); ?>
			</div><!-- .site-info -->

			<div class="site-social">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'social',
						'menu_class'     => 'nav-menu-social',
						'fallback_cb'    => '',
						'depth'          => 1,
					)
				);
				?>
			</div>

		</div>
	</footer><!-- #colophon -->

</div>

<div id="ajax-response"></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js" integrity="sha384-HwwvtgBNo3bZJJLYd8oVXjrBZt8cqVSpeBNS5n7C8IVInixGAoxmnlMuBnhbgrkm" crossorigin="anonymous"></script>
<?php wp_footer(); ?>
	
</body>
</html>
