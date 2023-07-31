<script>
	import 'bootstrap/dist/css/bootstrap.css';
	
	//Load the promotion data and map each promotion into a universal object that could be used to create each Card
	import mappedPromotions from './input.json';
	import {wellnessListIDs} from './wellnessListIDs';

	import Filter from './Filter.svelte';
	import Card from './Card.svelte';
	import Card2 from './Card2.svelte';

	mappedPromotions.sort((a,b) => a.title.localeCompare(b.title))
	
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
		<h1>Find here the list of all the promotions!</h1>
		<Filter on:filter={handleFilter} />
		<h3>Underneath an overview of the Card1 template:</h3>
		<div class="inner-container">
			{#each promotions as promotion (promotion.id)}
				<Card {promotion}/>
			{/each}
		</div>

		<h3>Underneath an overview of the Card2 template:</h3>

		<div class="inner-container">
			<div class="row">
				{#each promotions as promotion (promotion.id)}
					<div class="col-md-4">
						<Card2 {promotion}/>
					</div>
				{/each}
			</div>
		</div>
	</div>
</main>

<style>
	main {
		text-align: center;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}

	/* This is just for development testing, could be deleted later till given point */
	.inner-container {
		max-height: 600px;
		overflow-y: scroll;
		border: 1px solid #838383;
		padding: 5px;
	}
	.inner-container::-webkit-scrollbar {
		-webkit-appearance: none;
	}
	.inner-container::-webkit-scrollbar:vertical {
		width: 11px;
	}
	.inner-container::-webkit-scrollbar:horizontal {
		height: 11px;
	}
	.inner-container::-webkit-scrollbar-thumb {
		border-radius: 8px;
		border: 2px solid white; /* should match background, can't be transparent */
		background-color: rgba(0, 0, 0, .5);
	}
	/* Till here */

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	.container {
		max-width: 750px;
	}
	.col-md-4 {
		padding: 6px;
	}
	.col-md-4:first-child {
		padding-left: 0px;
	}
	.col-md-4:last-child {
		padding-right: 0px;
	}
	@media only screen and (max-width: 640px) {
		/* Somehow couldn't overwrite the other style where the max with stays on 240px with a smaller screen for main */
        main {
            max-width: 570px;
        }
	}
</style>