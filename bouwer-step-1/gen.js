/*
 What endpoints do you need to call to get the data that you need to build offer widgets?
 What arguments or parameters (if any) do you need to pass to calls to endpoint, 
    to get a specific range of data?

1. Experiment with above: 
    a. Configure Postman to connect to Daisycon api (configure as in add clientId|secrets, and make collection)
    b. Test run with api endpoints to see what data looks like, to figure out which you want to use
    c. From those Postman calls / collections, take a static version of data that was returned and use it
     - STOP making calls to the api everytime
     - make a /fixtures folder here, and move create e.g endpointA.json
    d. Start writing functions that work with example data (e.g read endpointA.json into variable)
        and manipulate it into our offers[] (or name it something else)
        - Bonus here: write tests for the functions that work with the data => 
            expect(transformA) to take bread and turn it into toast
2. ... You've got the building blocks for a new command - bouwer gen
    - But, I would experiment some more... after having worked through this, you should have a clearly idea
    of what you want to pass to each widget when its built => I would take a static snapshot of this
    and switch over to bouwer-step-2, add it as a static variable there, and build the component that you want from it
    - experiment with running npm run build <offers> => to get the bundle.js, bundle.css that we need to upload
3. Remember: what we want is a pipeline, that says:
    - fetch me the latest offers for campaign X 
    - collect / transform that data into a form that we will consume
    - consume this data in svelte component build process
    - this build process gives us the js/css output that we will upload / inject into campaign X wordpress site
4. Focus on experimenting above. Commander will into picutre when we start to package up / bring together the interface
    that allows us to work with this tool cleanly, instead of fumbling around with each part...
    (because theres no UI here, so commander is the equivelant of our user interface) 
*/