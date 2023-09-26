<script>
    export let campaignID;
    export let oldPrice;
    export let newPrice;
    export let discount;

    function numToEuroString(num) {
        return /\./.test(num.toString()) ? "€" + num.toFixed(2).replace(".", ",") : "€" + num + ",-"
    }

    if ((campaignID == 4179 || campaignID == 8308) && (newPrice == 1 || newPrice == 0)) {
        newPrice = "v.a. €1,-"   
    } else if (campaignID == 11136 || campaignID == 10456 || campaignID == 26224 || campaignID == 13048 || campaignID == 686 || campaignID == 2301) {
        if (oldPrice && newPrice) {
            discount = discount + '% korting!';
            oldPrice = numToEuroString(oldPrice);
            newPrice = numToEuroString(newPrice);
        } else if (!oldPrice && newPrice) {
            newPrice = numToEuroString(newPrice);
        }
    }
</script>

<div class="price-info">
    <div class="new-discount">
        <div class="old" class:hidden={oldPrice=="€0,-"}>
            {oldPrice ? oldPrice : ""}
        </div>
        <div class="new" style={discount ? 'background-color: transparent': ''}>
            {newPrice}
        </div>
    </div>
    <div class={discount? 'discount' : ''} class:hidden={oldPrice=="€0,-"}>
        {discount?discount:""}
    </div>
</div>

<style>
    .hidden {
        display: none;
    }
    .price-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }
    .price-info .new {
        color: #06a306;
        font-size: 1.05rem;
        font-weight: 600;
        background-color: #cfeccf;
        padding: 3px 10px;
        border-radius: 5%;
        text-decoration: underline;
    }
    .price-info .old {
        font-size: 0.9rem;
        text-decoration: line-through;
        color: #626262;
    }
    .new-discount {
        flex-direction: row;
        display: flex;
        align-items: center;
    }
    .price-info .discount {
        font-weight: 600;
        background-color: #cfeccf;
        padding: 3px 7px;
        border-radius: 5%;
        color: #06a406;
    }
    @media only screen and (max-width: 640px) {
        .price-info {
            flex-direction: column;
            align-items: center;
        }
    }
</style>