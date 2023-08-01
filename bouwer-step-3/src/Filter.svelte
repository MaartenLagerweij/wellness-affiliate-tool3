<script>
    import { createEventDispatcher } from "svelte";

    //import the campaigns so that they can be printed in the options
    import {campaigns} from './campaigns';
    import {wellnessListIDs} from './wellnessListIDs';
    import mappedPromotions from './input.json';

    //The numPromotionsForFilter is deleted in this project, maybe create new here, since before it came from the bouwer-step-2 project

    //numMatchedPromotionsOnSite and matchedPromotions are only for testing how many promotions match welness's on the current site
    let numMatchedPromotionsOnSite = 0;
    const matchedPromotions = [];

    mappedPromotions.forEach(promotion => {
        Object.entries(wellnessListIDs).map(([wellnessName, wellnessData]) => {
            if(wellnessData.regex.test(promotion.title)){
                wellnessData.numPromotions += 1
                numMatchedPromotionsOnSite += 1
                if(!matchedPromotions.includes(wellnessName)) matchedPromotions.push(wellnessName);
            }
            return wellnessName
        })
    })
    console.log('numMatchedPromotionsOnSite: ', numMatchedPromotionsOnSite);
    console.log(matchedPromotions);

    const dispatch = createEventDispatcher();
    
    const campaignsArray = Object.entries(campaigns);
    let wellnessArray = Object.entries(wellnessListIDs);
    //to sort the wellness centres inside the Filter, starting with the ones that have promotions
    wellnessArray.sort((a,b) => b[1].numPromotions - a[1].numPromotions)

    let selectedCampaignID;
    let selectedWellness;
    
    $: {
        dispatch('filter', {
            campaignID: selectedCampaignID,
            wellness: selectedWellness,
        });
    }

    //Make the new numPromotionsForFilter that before came from createPromotionsData.js:
    const numPromotionsForFilter = {
        'all': mappedPromotions.length,
        'SpaOnline.com': 0,
        'VakantieVeilingen': 0,
        'ActievandeDag': 0,
        'TicketVeiling': 0,
        'Tripper': 0,
        'HotelSpecials': 0,
        'ZoWeg': 0,
        'AD Webwinkel': 0,
        'Voordeeluitjes.nl': 0,
    }
    mappedPromotions.forEach(promotion => {
        //console.log(campaigns[promotion.campaignID].name)
        numPromotionsForFilter[campaigns[promotion.campaignID].name] += 1
    })
    console.log(numPromotionsForFilter);

</script>
<div class="filter">
    <label>
        <b>Selecteer een campagne:</b>
        <select class="form-select" bind:value={selectedCampaignID}>
            <option value="all">Alle ({numPromotionsForFilter.all})</option>
            {#each campaignsArray as [campaignID, {name}]}
                <option value={campaignID}>{name} ({numPromotionsForFilter[name]})</option>
            {/each}
        </select>
    </label>
    
    <label>
        <b>Selecteer een wellness:</b>
        <select class="form-select" bind:value={selectedWellness}>
            <option value="all">Alle</option>
            {#each wellnessArray as [name,{numPromotions}]}
                <option value={name}>{name} ({numPromotions})</option>
            {/each}
        </select>
    </label>
</div>

<style>
    .filter {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        margin: 10px 5px;
        border-bottom: 1px solid grey;
        padding: 10px 5px;
    }
    @media only screen and (max-width: 640px) {
		/* Somehow couldn't overwrite the other style where the max with stays on 240px with a smaller screen for main */
        .filter {
            flex-direction: column;
        }
	}
</style>