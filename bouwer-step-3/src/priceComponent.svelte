<script>
    export let oldPrice;
    export let newPrice;
    export let discount;
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
        font-size: 1.15rem;
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
        font-size: 1.1rem;
        font-weight: 500;
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