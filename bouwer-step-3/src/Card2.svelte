<script>

    import PriceComponent from './priceComponent.svelte';
    import { campaigns } from "./campaigns";
    export let promotion;

    let {url, image, campaignID, title, oldPrice, newPrice, discount} = promotion;


    let logoCampaignURL = campaigns[campaignID].image;
    if(/\|/.test(location))location = location.replace(/\|.*/,"");

    if(title.length > 50) title = title.substring(0,50) + "...";
</script>

<div class="promotion">
    <div class="img-wrapper">
        <img loading="lazy" class="promotion-img-top" src={image} alt={`Bekijk de promotie ${title}`} />
    </div>
    <div class="promotion-body" style="background-image: url({logoCampaignURL});">
        <div class="content-wrapper">
            <h5 class="promotion-title">{title}</h5>
    
            <PriceComponent {campaignID} {oldPrice} {newPrice} {discount}  />

        </div>
        <!-- {#if location && (typeof location !== 'object' || (Array.isArray(location) && location.length > 0))}
            <p class="promotion-location"><i class="fas fa-map-marker"></i>  {location}</p>
        {/if} -->
    </div>
    <div class="promotion-footer">
        <a href={url} target="_blank">
            <div class="button-container">
                <button class="svelte-129k69g"><span class="svelte-129k69g">Bekijk aanbieding</span></button>
                <img src="https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/pijl2.png" alt="Call to action pijl" class="svelte-129k69g">
            </div>
        </a>
    </div>
</div>

<style>
    .promotion {
        min-height: 460px;
        margin-bottom: 12px;
        --bs-card-spacer-y: 1rem;
        --bs-card-spacer-x: 1rem;
        --bs-card-title-spacer-y: 0.5rem;
        --bs-card-title-color: ;
        --bs-card-subtitle-color: ;
        --bs-card-border-width: var(--bs-border-width);
        --bs-card-border-color: var(--bs-border-color-translucent);
        --bs-card-border-radius: var(--bs-border-radius);
        --bs-card-box-shadow: ;
        --bs-card-inner-border-radius: calc(var(--bs-border-radius) - (var(--bs-border-width)));
        --bs-card-cap-padding-y: 0.5rem;
        --bs-card-cap-padding-x: 1rem;
        --bs-card-cap-bg: rgba(var(--bs-body-color-rgb), 0.03);
        --bs-card-cap-color: ;
        --bs-card-height: ;
        --bs-card-color: ;
        --bs-card-bg: var(--bs-body-bg);
        --bs-card-img-overlay-padding: 1rem;
        --bs-card-group-margin: 0.75rem;
        position: relative;
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: var(--bs-card-height);
        color: var(--bs-body-color);
        word-wrap: break-word;
        background-color: var(--bs-card-bg);
        background-clip: border-box;
        border: var(--bs-card-border-width) solid var(--bs-card-border-color);
        border-radius: var(--bs-card-border-radius);
    }
    .promotion h5 {
        margin: 6px 0 4px;
    }
    .promotion-body {
        background-repeat: no-repeat;
        background-position: left bottom;
        background-size: auto 40px;
        flex: 1 1 auto;
        padding: var(--bs-card-spacer-y) var(--bs-card-spacer-x);
        color: var(--bs-card-color);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 10px 5px 35px 5px;
    }
    .content-wrapper {
        filter: grayscale(0%);
    }
    .img-wrapper {
        height: 150px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .promotion-img-top {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .promotion button {
        box-shadow: 0 0 3px #7b7b7b;
        background-color: #f46500;
        border: 2px solid #fff;
        border-radius: 3px;
        font-weight: bold;
        min-width: 180px;
        margin: 10px 0px;
        color: #fff;
        padding: 10px;
    }

    .promotion button {
        display: inline-block;
    }

    .promotion button span {
        cursor: pointer;
        display: inline-block;
        position: relative;
        transition: 0.5s;
    }

    .promotion button span:after {
        content: "\00bb";
        position: absolute;
        opacity: 0;
        top: 0;
        right: -20px;
        transition: 0.5s;
    }

    .promotion button:hover span {
        padding-right: 25px;
    }

    .promotion button:hover span:after {
        opacity: 1;
        right: 0;
    }
    .promotion-footer {
        padding: var(--bs-card-cap-padding-y) var(--bs-card-cap-padding-x);
        color: var(--bs-card-cap-color);
        background-color: var(--bs-card-cap-bg);
        border-top: var(--bs-card-border-width) solid var(--bs-card-border-color);
    }
    .promotion .promotion-footer img {
        transform: rotate(45deg);
        margin: -10px -30px -8px 0px;
    }
    .button-container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .fa-map-marker:before {
        content: "\f041";
        font: normal normal normal 14px/1 FontAwesome;
        font-size: 22px;
        color: #595959;
    }
</style>
