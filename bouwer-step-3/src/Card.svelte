<script>
    import {campaigns} from './campaigns';
    import PriceComponent from './priceComponent.svelte';

    export let promotion;
    //export let currentWellness;

    let {url, campaignID, title, location, oldPrice, newPrice, wellnessName, discount} = promotion;

    
    if(/\|/.test(location))location = location.replace(/\|.*/,"");
    
    //let show = currentWellness === wellnessName ? true : false;
    //style="display: {show ? "block" : "none"}"
</script>

    <a href={url} target="_blank" title={`Korting ${campaigns[campaignID].name}`}  class="promotion-link">
        <div class="promotion">
            <div class="promotion-body">
                <div class="logo"><img src={campaigns[campaignID].image} alt={`logo ${campaigns[campaignID].name}`} /></div>
                <div class="promotion-info">
                    <h5 class="promotion-title">{title}</h5>
                    <div class="extra-info">
                        {#if location && (typeof location !== 'object' || (Array.isArray(location) && location.length > 0))}
                            <p class="promotion-location">  {location}</p>
                        {/if}
                        <PriceComponent {oldPrice} {newPrice} {discount} {campaignID} />
                    </div>
                </div>
                <div class="cta">
                    <a target="_blank" href={url}><button><span>Bekijk actie</span></button></a>
                    <img src="https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/pijl2.png" alt="Call to action pijl"/>
                </div>
            </div>
        </div>
    </a>

<style>
    /* Changed the .card bootstrap to .promotion with all corresponding elements */
    .promotion-link {
        text-decoration: none;
    }
    .logo {
        max-width: 105px;
    }
    .promotion {
        margin: 10px;
        border: dashed 1px #4f4f4f;
    }
    .promotion-body {
        text-decoration: none !important;
        padding: 16px;
    }
    .promotion-info {
        color: black;
    }
    .promotion-location {
        margin-bottom: 0px;
        text-align: center;
    }
    .promotion:hover {
        cursor: pointer;
        text-decoration: underline;
    }
    .promotion-body {
        display: flex;
        align-items: center;
        gap: 1rem;
        justify-content: space-between;
    }
    .promotion .extra-info {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        align-items: center;
        gap: 2rem;
    }
    
    /* All the button styling and span hover effect */
    .promotion button {
        box-shadow: 0 0 3px #7b7b7b;
        background-color: #f46500;
        border: 2px solid #fff;
        border-radius: 3px;
        font-weight: bold;
        min-width: 140px;
        color: #fff;
        padding: 8px;
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
    /* On Wellnesscentrumnederland.nl the styles for h5 would otherwise get a lot of margin */
    .promotion h5 {
        margin: 6px 0 4px;
        font-size: 15px;
    }
    .cta {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .cta img {
        transform: rotate(-40deg) scaleX(-1);
        margin: -4px 0px -10px -40px;
    }
    
    .fa-map-marker:before {
        content: "\f041";
        font: normal normal normal 14px/1 FontAwesome;
        font-size: 22px;
        color: #595959;
    }
    /* Make the Promotion cards more responsive */
    @media only screen and (max-width: 640px) {
        .promotion {
            margin: 10px 0px;
        }
        .promotion h5 {
            margin: 0px 0px 5px 0px;
        }
        .promotion-body {
            flex-direction: column;
            align-items: center;
            padding: 10px;
            gap: 0.75rem;
        }
    }
    
</style>