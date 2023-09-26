<script>
	import 'bootstrap/dist/css/bootstrap.css';
	
	//Load the promotion data and map each promotion into a universal object that could be used to create each Card
	import mappedPromotions from './input.json';
	import {wellnessListIDs} from './wellnessListIDs';

	import Filter from './Filter.svelte';
	import Card from './Card.svelte';
	import Card2 from './Card2.svelte';

	//Get the <div> of the svelte-app on the active page in order to then get the correct WellnessID to then connect the right promotion to
	let svelteAppElement = document.getElementById('svelte-app');
    let currentWellness = svelteAppElement.dataset.wellnessid

	//Sort based on title: 
	//mappedPromotions.sort((a,b) => a.title.localeCompare(b.title))
	//Sort based on the discount
	mappedPromotions.sort((a, b) => b.discount - a.discount);
	
	let selectedCampaignID;
	let selectedWellness;

	let promotions = [];

	$: {
		promotions = mappedPromotions;
		if (selectedCampaignID && selectedCampaignID !== 'all') {
			promotions = mappedPromotions.filter(promotion => promotion.campaignID == selectedCampaignID);
		} if (selectedWellness && selectedWellness !== 'all') {
			promotions = mappedPromotions.filter(promotion => wellnessListIDs[selectedWellness].regex.test(promotion.title));
		}
	}

	function handleFilter(event){
		selectedCampaignID = event.detail.campaignID;
		selectedWellness = event.detail.wellness;
	}
</script>

<main>
	<div class="container">
		<!-- <Filter on:filter={handleFilter} />
			{#each promotions as promotion (promotion.id)}
				<Card {promotion} {currentWellness}/>
			{/each} -->

		<!-- <h3>Underneath an overview of the Card2 template:</h3>-->

		<Filter on:filter={handleFilter} />
			<div class="row">
				{#each promotions as promotion (promotion.id)}
					<div class="col-md-4">
						<Card2 {promotion} />
					</div>
				{/each}
			</div>
	</div>
</main>

<style>
	main {
		text-align: center;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	.container {
		max-width: 750px;
		padding-right: 0px;
		padding-left: 0px;
	}
	/*
	.col-md-4 {
		padding: 6px;
	}
	.col-md-4:first-child {
		padding-left: 0px;
	}
	.col-md-4:last-child {
		padding-right: 0px;
	} */
	@media only screen and (max-width: 640px) {
		/* Somehow couldn't overwrite the other style where the max with stays on 240px with a smaller screen for main */
        main {
            max-width: 570px;
        }
	}
</style>