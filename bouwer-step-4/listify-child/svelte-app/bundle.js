
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var mappedPromotions = [
    	{
    		id: 0,
    		campaignID: 11136,
    		wellnessName: "Parkhotel Horst",
    		title: "Parkhotel Horst",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=fa547154ab6117a0ea55a9a45e9dc94c&dl=limburg%2Fparkhotel-horst&ws=",
    		oldPrice: 159,
    		newPrice: 143.1,
    		image: "https://www.spaonline.com/spafotos/201/thumb/2.jpg",
    		location: "Horst|Limburg"
    	},
    	{
    		id: 1,
    		campaignID: 11136,
    		wellnessName: "Wellness Center De Bronsbergen",
    		title: "Wellness Center NLG de Bronsbergen",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=43ddd8c13ed00195cae3c20760fc93d5&dl=gelderland%2Fsauna-bronsbergen-zutphen&ws=",
    		oldPrice: 41.5,
    		newPrice: 33.5,
    		image: "https://www.spaonline.com/spafotos/286/thumb/1.jpg",
    		location: "Zutphen|Gelderland"
    	},
    	{
    		id: 2,
    		campaignID: 11136,
    		wellnessName: "Wellness Goes",
    		title: "Wellnessresort Goes",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=9c655e6dfe292608d6887e6127b36903&dl=zeeland%2Fwellness-goes&ws=",
    		oldPrice: 30.5,
    		newPrice: 22.88,
    		image: "https://www.spaonline.com/spafotos/214/thumb/1.jpg",
    		location: "Goes|Zeeland"
    	},
    	{
    		id: 3,
    		campaignID: 11136,
    		wellnessName: "Thermae Son",
    		title: "Thermae Son",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=2298c195cac162984053a7a30f372a1a&dl=noord-brabant%2Fthermae-son&ws=",
    		oldPrice: 34,
    		newPrice: 30.6,
    		image: "https://www.spaonline.com/spafotos/112/thumb/1.jpg",
    		location: "Son en Breugel|Noord-Brabant"
    	},
    	{
    		id: 4,
    		campaignID: 11136,
    		wellnessName: "Spavarin",
    		title: "Spavarin",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=21cc58983803b178d2a4e89834e3a937&dl=zuid-holland%2Fspavarin&ws=",
    		oldPrice: 25,
    		newPrice: 22.5,
    		image: "https://www.spaonline.com/spafotos/215/thumb/1.jpg",
    		location: "Rijswijk|Zuid-Holland"
    	},
    	{
    		id: 5,
    		campaignID: 11136,
    		wellnessName: "Sauna Beautyfarm Midwolda",
    		title: "Sauna Beauty Farm Midwolda",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=635881ca3b3a4fcc4665452c5935b121&dl=groningen%2Fsauna-beauty-farm-midwolda&ws=",
    		oldPrice: 26.5,
    		newPrice: 23.85,
    		image: "https://www.spaonline.com/spafotos/50/thumb/sbfarm.jpg",
    		location: "Midwolda|Groningen"
    	},
    	{
    		id: 6,
    		campaignID: 11136,
    		wellnessName: "Sauna En Beauty Ommen",
    		title: "Sauna & Beauty Ommen",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=768d34d03649f0961d0fe337c8d73988&dl=overijssel%2Fsauna-beauty-ommen&ws=",
    		oldPrice: 22.5,
    		newPrice: 19,
    		image: "https://www.spaonline.com/spafotos/76/thumb/1.jpg",
    		location: "Ommen|Overijssel"
    	},
    	{
    		id: 7,
    		campaignID: 11136,
    		wellnessName: "Sauna Epe",
    		title: "Saunapark Epe",
    		url: "https://lt45.net/c/?si=11136&li=1500380&wi=244044&pid=47e957843c634d53657245c8f04fe0c2&dl=overijssel%2Fsaunapark-epe&ws=",
    		oldPrice: 29.5,
    		newPrice: 26.55,
    		image: "https://www.spaonline.com/spafotos/232/thumb/1.jpg",
    		location: "Gronau-Epe /Duitsland|Overijssel"
    	},
    	{
    		id: 8,
    		campaignID: 4179,
    		wellnessName: "Zwaluwhoeve",
    		title: "Zwaluwhoeve in Hierden, Gelderland: dagentree",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fzwaluwhoeve-sauna%2F32874",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/od-GJwGPPHlh_2upbxunvj8CfnY=/500x500/vv/images/products/442/153442/zwaluwhoeve-5-e18de209.jpg",
    		location: [
    			"Hierden"
    		]
    	},
    	{
    		id: 9,
    		campaignID: 4179,
    		wellnessName: "Veluwse Bron",
    		title: "Veluwse Bron in Emst, Gelderland: dagentree",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fveluwse-bron-2022%2F33409",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/rALeBv3iHSlhgiOOu_o5E1cwyYI=/500x500/vv/images/products/466/153466/veluwse-bron-4-63b48e09.jpg",
    		location: [
    			"Emst"
    		]
    	},
    	{
    		id: 10,
    		campaignID: 4179,
    		wellnessName: "Thermen Holiday",
    		title: "Thermen Holiday in Schiedam, Zuid-Holland: entree",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fthermen-holiday-sauna%2F33871",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/qpVckGvFZkTi7mpttwqP6L6Hi68=/500x500/vv/images/products/601/153601/thermen-holiday-4-9cf5569a.jpg",
    		location: [
    			"Schiedam"
    		]
    	},
    	{
    		id: 11,
    		campaignID: 4179,
    		wellnessName: "Elysium",
    		title: "Elysium in Bleiswijk, Zuid-Holland: dagentree",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fdagentree-sauna-wellnessresort-elysium%2F2229",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/k9T3qoTYlu1FMiZwvJL-zCBakto=/500x500/vv/images/products/399/153399/elysium-sauna-3-c09e4096.jpg",
    		location: [
    			"Bleiswijk"
    		]
    	},
    	{
    		id: 12,
    		campaignID: 4179,
    		wellnessName: "Wellnessboot Mill",
    		title: "Dagentree op BLUE Wellnessboot Mill, Brabant",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fblue-wellnessboot-mill-brabant%2F44391",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/bmiXT-VYolTvFW7_v28OTb9H1Jo=/500x500/vv/images/products/815/159815/blue_wellness_boot-0d2a397a.jpg",
    		location: [
    		]
    	},
    	{
    		id: 13,
    		campaignID: 4179,
    		wellnessName: "Wellness Helmond",
    		title: "Saunaentree bij BLUE Wellnessresort, Helmond",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fblue-wellnessresort-helmond%2F44394",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/NjxluUHCJFCfFvpcvk-EsirYRMI=/500x500/vv/images/products/818/159818/blue-wellness-helmond-1-8aa6d4cc.jpg",
    		location: [
    		]
    	},
    	{
    		id: 14,
    		campaignID: 4179,
    		wellnessName: "Wellness Sittard",
    		title: "Dagentree bij BLUE Wellnessresort Sittard",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fblue-wellnessresort-sittard%2F44393",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/HMz8i0hDl4B1qGeOvdGprmjwuz0=/500x500/vv/images/products/819/159819/blue-wellness-sittard-4-9d0efde4.jpg",
    		location: [
    		]
    	},
    	{
    		id: 15,
    		campaignID: 4179,
    		wellnessName: "Thermen De Waterlelie",
    		title: "Wellnessresort de Waterlelie: dag- of avondentree",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fwellnessresort-waterlelie-dagentree-of-avondentree%2F43711",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/X0QnmTIbdljQ-uen-fE8BSj0Dkc=/500x500/vv/images/products/294/159294/waterlelie-thermen-4-b377e211.jpg",
    		location: [
    		]
    	},
    	{
    		id: 16,
    		campaignID: 4179,
    		wellnessName: "Wellness Leiden",
    		title: "Dagentree bij BLUE Wellnessresort Leiden",
    		url: "https://tc.tradetracker.net/?c=4179&m=1185051&a=228134&r=&u=https%3A%2F%2Fwww.vakantieveilingen.nl%2Fveilingen%2Fsauna-en-beauty%2Fsauna-en-wellness%2Fblue-wellnessresort-leiden%2F44389",
    		oldPrice: null,
    		newPrice: 1,
    		image: "https://images.emesa-static.com/HrDB57RVFIbHaaKzzHOQyaQpeWk=/500x500/vv/images/products/816/159816/blue-wellness-leiden-1-f1ac6afc.jpg",
    		location: [
    		]
    	},
    	{
    		id: 17,
    		campaignID: 8308,
    		wellnessName: "Thermen Anholts",
    		title: "1 ticket voor Thermen & Wellness Anholts in Schoonebeek!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fthermen-wellness-anholts-schoonebeek-korting-2",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Thermen-Anholts/Anholts-2-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 18,
    		campaignID: 8308,
    		wellnessName: "Sauna Het Friese Woud",
    		title: "Een dagje ontspannen bij Sauna Het Friese Woud voor 2 personen!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsauna-het-friese-woud-2-personen-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Het Friese Woud/Het-Friese-Woud-1-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 19,
    		campaignID: 8308,
    		wellnessName: "Dennenmarken",
    		title: "Een dagje ontspannen bij Sauna Dennenmarken in Limburg!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsauna-dennenmarken-limburg-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Dennenmarken-Sauna/Sauna-Dennenmarken-11689258364.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 20,
    		campaignID: 8308,
    		wellnessName: "Dennenmarken",
    		title: "Voor 2 personen een Wellness Hotelarrangement bij Sauna Dennenmarken!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fhotels%2Fweekendjes-weg%2Fwellness-hotelarrangement-sauna-dennenmarken-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Dennenmarken-Sauna/Overnachting-Dennenmarken-1.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 21,
    		campaignID: 8308,
    		title: "2x Dagentree + beautybehandeling + glaasje bubbels bij Sauna Dennenmarken!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fwellness-arrangementen%2Fsauna-dennenmarken-beautybehandeling-bubbels",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Dennenmarken-Sauna/Beautybehandeling-1.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 22,
    		campaignID: 8308,
    		wellnessName: "Sauna Drome Putten",
    		title: "2 avond entreetickets voor Sauna Drôme in Putten!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsaunadrome-putten-avondentree",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Saunadrome Putten/Sauna-Drome-1-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 23,
    		campaignID: 8308,
    		wellnessName: "Sauna Het Friese Woud",
    		title: "Voor 1 persoon een dagje ontspannen bij Sauna Het Friese Woud!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsauna-het-friese-woud-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Het Friese Woud/Friese-Woud-2-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 24,
    		campaignID: 8308,
    		wellnessName: "Thermen Anholts",
    		title: "2 tickets voor Thermen & Wellness Anholts in Schoonebeek!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fthermen-wellness-anholts-schoonebeek-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Thermen-Anholts/Anholts-1-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 25,
    		campaignID: 8308,
    		wellnessName: "Sauna Drome Putten",
    		title: "2 dagtickets voor Sauna Drôme in Putten!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsaunadrome-putten-dagentree-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Saunadrome Putten/Saunadrome-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 26,
    		campaignID: 8308,
    		wellnessName: "Spasereen",
    		title: "Voor 2 personen ontspannen bij SpaSereen in Maastricht!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fspasereen-maastricht-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/Logo_Juni_2023/spasereen1.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 27,
    		campaignID: 8308,
    		wellnessName: "Sauna De Bron",
    		title: "Een heerlijk dagje ontspannen bij Sauna de Bron voor 2 personen!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsauna-de-bron-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Sauna-de-Bron/Sauna-de-Bron-21689325018.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 28,
    		campaignID: 8308,
    		wellnessName: "Dennenmarken",
    		title: "Voor 2 personen sauna entree en 1 uur padellen bij Sauna Dennenmarken!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna-entree-padellen-sauna-dennenmarken-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Dennenmarken-Sauna/Sauna-Dennenmarken-Padel-1-logo.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 29,
    		campaignID: 8308,
    		wellnessName: "Centre Du Lac",
    		title: "2 tickets voor een heerlijke saunadag bij Centre du Lac!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fcentre-du-lac-dagentree-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/Logo-januari-2023/centredulac2.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 30,
    		campaignID: 8308,
    		wellnessName: "Sauna Drome Putten",
    		title: "1 avond entreeticket voor Sauna Drôme in Putten!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsaunadrome-putten-avondentree-1persoon",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Saunadrome Putten/Saunadrome-logo-4.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 31,
    		campaignID: 8308,
    		title: "1 dagticket voor Sauna Drôme in Putten!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsaunadrome-putten-dagentree-1",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Saunadrome Putten/Sauna-Drome-22.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 32,
    		campaignID: 8308,
    		wellnessName: "Centre Du Lac",
    		title: "Een heerlijk ontspannen saunadag bij Centre du Lac voor 1 persoon!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fsauna-centredulac-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/Logo-januari-2023/centredulac.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 33,
    		campaignID: 8308,
    		wellnessName: "Thermen De Waterlelie",
    		title: "2 tickets voor Wellnessresort de Waterlelie!",
    		url: "https://www.ticketveiling.nl/tickets/?tt=8308_1922718_228134_&r=https%3A%2F%2Fwww.ticketveiling.nl%2Fsauna%2Fsauna%2Fwellnessresort-de-waterlelie-korting",
    		oldPrice: null,
    		newPrice: 0,
    		image: "https://ticketveiling.imgix.net/aanbieders/Wellnessresort-Waterlelie/Waterlelie.jpg?q=70&w=560&h=300&fit=crop&auto=compress,format,enhance"
    	},
    	{
    		id: 34,
    		campaignID: 26224,
    		wellnessName: "Sauna De Bron",
    		title: "Entree Sauna de Bron",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fdagentree-sauna-de-bron-korting",
    		oldPrice: 31.95,
    		newPrice: 20.5,
    		image: "https://tripper.imgix.net/dagentree-sauna-de-bron-korting/8e45d1.jpg"
    	},
    	{
    		id: 35,
    		campaignID: 26224,
    		wellnessName: "Dennenmarken",
    		title: "Entreeticket Sauna Dennenmarken",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fentree-sauna-dennenmarken-korting",
    		oldPrice: 38.5,
    		newPrice: 20.5,
    		image: "https://tripper.imgix.net/entree-sauna-dennenmarken-korting/70b1be.jpg"
    	},
    	{
    		id: 36,
    		campaignID: 26224,
    		wellnessName: "Spasereen",
    		title: "Entreeticket SpaSereen Maastricht",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fticket-spasereen-maastricht-korting",
    		oldPrice: 39.5,
    		newPrice: 29.5,
    		image: "https://tripper.imgix.net/ticket-spasereen-maastricht-korting/794c92.jpg"
    	},
    	{
    		id: 37,
    		campaignID: 26224,
    		wellnessName: "Sauna Drome Putten",
    		title: "Dag of avondentree Sauna Drôme in Putten",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Ftickets-sauna-drome-putten-korting",
    		oldPrice: 35.5,
    		newPrice: 21.5,
    		image: "https://tripper.imgix.net/tickets-sauna-drome-putten-korting/e38cb6.jpg"
    	},
    	{
    		id: 38,
    		campaignID: 26224,
    		wellnessName: "Dennenmarken",
    		title: "Entree Sauna Dennenmarken + behandeling/drankje of maaltijdsalade",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fentree-sauna-dennenmarken-arrangementen-korting",
    		oldPrice: 63.5,
    		newPrice: 36.5,
    		image: "https://tripper.imgix.net/entree-sauna-dennenmarken-arrangementen-korting/e3101e.jpg"
    	},
    	{
    		id: 39,
    		campaignID: 26224,
    		wellnessName: "Sauna Het Friese Woud",
    		title: "Dagentree Sauna Het Friese Woud",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fsauna-friese-woud-met-korting",
    		oldPrice: 29.5,
    		newPrice: 23.5,
    		image: "https://tripper.imgix.net/sauna-friese-woud-met-korting/a59baf.jpg"
    	},
    	{
    		id: 40,
    		campaignID: 26224,
    		wellnessName: "Thermen Anholts",
    		title: "Entreeticket Thermen & Beautycentrum Anholts",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fticket-thermen-beautycentrum-anholts-korting",
    		oldPrice: 33,
    		newPrice: 25.5,
    		image: "https://tripper.imgix.net/ticket-thermen-beautycentrum-anholts-korting/1c7997.jpg"
    	},
    	{
    		id: 41,
    		campaignID: 26224,
    		wellnessName: "Thermen De Waterlelie",
    		title: "Dagentree Wellnessresort de Waterlelie",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fkorting-dagentree-wellnessresort-de-waterlelie-korting",
    		oldPrice: 39.5,
    		newPrice: 25.95,
    		image: "https://tripper.imgix.net/korting-dagentree-wellnessresort-de-waterlelie-korting/43beec.jpg"
    	},
    	{
    		id: 42,
    		campaignID: 26224,
    		wellnessName: "Dennenmarken",
    		title: "Entree Sauna Dennenmarken + 1 uur Padel",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fentree-sauna-dennenmarken-1-uur-padel-korting",
    		oldPrice: 31.5,
    		newPrice: 19,
    		image: "https://tripper.imgix.net/entree-sauna-dennenmarken-1-uur-padel-korting/d909df.jpg"
    	},
    	{
    		id: 43,
    		campaignID: 26224,
    		wellnessName: "Centre Du Lac",
    		title: "Dagentree Centre du Lac",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Ftickets-centre-du-lac-korting",
    		oldPrice: 38,
    		newPrice: 27.95,
    		image: "https://tripper.imgix.net/tickets-centre-du-lac-korting/5d7213.jpg"
    	},
    	{
    		id: 44,
    		campaignID: 26224,
    		wellnessName: "Wellness Center De Bronsbergen",
    		title: "Dagentree Wellness Center de Bronsbergen",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fdagentree-wellness-center-de-bronsbergen-korting",
    		oldPrice: 37.5,
    		newPrice: 26.5,
    		image: "https://tripper.imgix.net/dagentree-wellness-center-de-bronsbergen-korting/9cda92.jpg"
    	},
    	{
    		id: 45,
    		campaignID: 26224,
    		wellnessName: "Spavarin",
    		title: "Dagentree Cityspa Spavarin + arrangement",
    		url: "https://www.tripper.nl/trips/?tt=26224_1169772_228134_&r=https%3A%2F%2Fwww.tripper.nl%2Fdeal%2Fentree-dag-cityspa-spavarin-arrangement-korting",
    		oldPrice: 25,
    		newPrice: 19.5,
    		image: "https://tripper.imgix.net/entree-dag-cityspa-spavarin-arrangement-korting/b2e38b.jpg"
    	},
    	{
    		id: 46,
    		campaignID: 2301,
    		wellnessName: "Wellness Helmond",
    		title: "Fletcher Wellness-Hotel Helmond",
    		url: "https://www.zoweg.nl/tradetracker/?tt=2301_750467_228134_&r=https%3A%2F%2Fwww.zoweg.nl%2Fhotels%2Fnl%2Fhotel-helmond%2Ffletcher-wellness-hotel-helmond%2F",
    		oldPrice: null,
    		newPrice: 99,
    		image: "https://www.zoweg.nl/getimage/accommodations/202108/212/159/328_104459.jpg",
    		location: [
    			"Helmond"
    		]
    	},
    	{
    		id: 47,
    		campaignID: 13048,
    		title: "Saunatopia - Toegang voor twee personen",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=b41d16aec5772420049e06393627b350&dl=product%2Fsaunatopia&ws=",
    		oldPrice: 66,
    		newPrice: 44,
    		image: "https://media.graphassets.com/i8FurIHySQKlodWF3ZXC",
    		location: ""
    	},
    	{
    		id: 48,
    		campaignID: 13048,
    		wellnessName: "Spasense",
    		title: "Dagje wellness bij SpaSense",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=ac5e409841b3dd4747da3ea2afb0f88f&dl=product%2Fwellness-spasense&ws=",
    		oldPrice: 39.5,
    		newPrice: 24.7,
    		image: "https://media.graphassets.com/OnUUQst8QCSVP1nI1TNm",
    		location: ""
    	},
    	{
    		id: 49,
    		campaignID: 13048,
    		wellnessName: "Spa Wellness Weesp",
    		title: "Dagje wellness bij SpaWeesp",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=ef6cfc89366e77058d64fb75b90370df&dl=product%2Fwellness-spaweesp&ws=",
    		oldPrice: 38.5,
    		newPrice: 22.2,
    		image: "https://media.graphassets.com/uV7wKRNTD2aRfluZlrvg",
    		location: ""
    	},
    	{
    		id: 50,
    		campaignID: 13048,
    		wellnessName: "Spapuur",
    		title: "Dagje wellness bij SpaPuur",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=cd8e41802d9e35c7e2625a1a86ff9462&dl=product%2Fwellness-spapuur&ws=",
    		oldPrice: 34.5,
    		newPrice: 20,
    		image: "https://media.graphassets.com/RQ01s3j0QQGU4dtWWKxE",
    		location: ""
    	},
    	{
    		id: 51,
    		campaignID: 13048,
    		wellnessName: "Thermen Holiday",
    		title: "Dagje wellness bij Thermen Holiday",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=26b1b66ec04afc699627507dba741b61&dl=product%2Fwellness-thermenholiday&ws=",
    		oldPrice: 38.52,
    		newPrice: 22.2,
    		image: "https://media.graphassets.com/CDGo857PTpOQi5kEDjwt",
    		location: ""
    	},
    	{
    		id: 52,
    		campaignID: 13048,
    		wellnessName: "Body Home",
    		title: "Goodbye Stress Home&Body Pakket",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=99474f4fbb565b52a1fb07bf8940ee18&dl=product%2Fgoodbye-stress-home-body-pakket&ws=",
    		oldPrice: 49.95,
    		newPrice: 27.95,
    		image: "https://media.graphassets.com/q7QMkJN4TRrqdZ5CZSQZ",
    		location: ""
    	},
    	{
    		id: 53,
    		campaignID: 13048,
    		wellnessName: "Zwaluwhoeve",
    		title: "Dagje wellness bij Zwaluwhoeve",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=f59f147ef7c72fa6c7071281b35ff86c&dl=product%2Fzwaluwhoeve&ws=",
    		oldPrice: 38.5,
    		newPrice: 22.2,
    		image: "https://media.graphassets.com/88KGDGmS1KDTYRTN3xw8",
    		location: ""
    	},
    	{
    		id: 54,
    		campaignID: 13048,
    		wellnessName: "Veluwse Bron",
    		title: "Dagje wellness bij Veluwse Bron",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=d63c9950dbe555a7a293dd1f7af127af&dl=product%2Fwellness-veluwsebron&ws=",
    		oldPrice: 42.5,
    		newPrice: 26.5,
    		image: "https://media.graphassets.com/ZWjrmxMQ3GM98y0RZIQw",
    		location: ""
    	},
    	{
    		id: 55,
    		campaignID: 13048,
    		title: "Jugendstil-paddenstoellamp'Berlin'",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=c5c46550494775f33a0620d7d9fb06c0&dl=product%2Fjugendstil-paddenstoellamp-berlin&ws=",
    		oldPrice: 0,
    		newPrice: 305,
    		image: "https://media.graphassets.com/9bnFerfIQNS0WWAAMxPe",
    		location: ""
    	},
    	{
    		id: 56,
    		campaignID: 13048,
    		wellnessName: "Elysium",
    		title: "Dagje wellness bij Elysium",
    		url: "https://lt45.net/c/?si=13048&li=1685001&wi=244044&pid=eefd0c9287030f39f487bbe445fe6fe3&dl=product%2Fdagje-wellness-elysium&ws=",
    		oldPrice: 42.5,
    		newPrice: 26.5,
    		image: "https://media.graphassets.com/8qQ1Fp5SS3Wz7ZvZDbjE",
    		location: ""
    	},
    	{
    		id: 57,
    		campaignID: 686,
    		wellnessName: "Sanadome",
    		title: "Sanadome Hotel & Spa",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F19144.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 190,
    		image: "https://media.bookerzzz.com/1e63ecc7d94461b9486a94eb3fab35ee.jpeg",
    		location: [
    			"Nijmegen"
    		]
    	},
    	{
    		id: 58,
    		campaignID: 686,
    		wellnessName: "Spa Wellness Chateau St Gerlach",
    		title: "Chateau St. Gerlach",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F334.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 269,
    		image: "https://media.bookerzzz.com/2911121ab8a6d0f5d77e5ce0b7d4595b.jpeg",
    		location: [
    			"Valkenburg"
    		]
    	},
    	{
    		id: 59,
    		campaignID: 686,
    		wellnessName: "Bad Boekelo",
    		title: "Resort Bad Boekelo",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F188.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 100.33,
    		image: "https://media.bookerzzz.com/03c32b3b55c7fccc182339b3e89e097a.jpeg",
    		location: [
    			"Boekelo"
    		]
    	},
    	{
    		id: 60,
    		campaignID: 686,
    		wellnessName: "Landgoed De Rosep",
    		title: "Landgoed de Rosep",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F399.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 126,
    		image: "https://media.bookerzzz.com/5f36a020ac8c3068cf4763d16f0caf11.jpeg",
    		location: [
    			"Oisterwijk"
    		]
    	},
    	{
    		id: 61,
    		campaignID: 686,
    		wellnessName: "Thermen Bussloo",
    		title: "Wellness & Hotel Thermen Bussloo",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F7697.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 270,
    		image: "https://media.bookerzzz.com/75158158a22f13966e9dcf07398f2830.jpeg",
    		location: [
    			"Bussloo"
    		]
    	},
    	{
    		id: 62,
    		campaignID: 686,
    		wellnessName: "Zuiver Amsterdam",
    		title: "Hotel & Wellness Zuiver",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F6564.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 180,
    		image: "https://media.bookerzzz.com/72bbf516972e152d2e939eda14d4ce76.jpeg",
    		location: [
    			"Amsterdam"
    		]
    	},
    	{
    		id: 63,
    		campaignID: 686,
    		wellnessName: "Spavarin",
    		title: "Restaurant, Hotel & Spa Savarin",
    		url: "https://www.hotelspecials.nl/hotel/?tt=686_344304_228134_&r=https%3A%2F%2Fwww.hotelspecials.nl%2Fh%2F6126.html%3Futm_source%3Dtradetracker",
    		oldPrice: null,
    		newPrice: 159,
    		image: "https://media.bookerzzz.com/32afea84d2375cc8e05668e5e28d2938.jpeg",
    		location: [
    			"Rijswijk"
    		]
    	}
    ];

    const wellnessListIDs = {
      "Wellnesshoeve Butterfly" : { ID: 1, regex:  /^(?=.*wellnesshoeve)(?=.*butterfly).*$/ig, numPromotions: 0},
      "Het Nolderwoud" : { ID: 2, regex: /nolderwoud/gi , numPromotions: 0},
      "Thermen Lucaya" : { ID: 3, regex: /lucaya/gi , numPromotions: 0},
      "Salon Francy" : { ID: 4, regex: /francy/gi , numPromotions: 0},
      "Fort Resort Beemster" : { ID: 5, regex: /^(?=.*fort)(?=.*beemster).*$/ig , numPromotions: 0},
      "Zonnestudio Sunshine Groningen" : { ID: 6, regex: /^(?=.*sunshine)(?=.*groningen).*$/ig , numPromotions: 0},
      "Plaza Sportiva Wellness" : { ID: 7, regex: /^(?=.*sportiva)(?=.*wellness).*$/ig , numPromotions: 0},
      "Sauna Keizer" : { ID: 8, regex: /^(?=.*sauna)(?=.*keizer).*$/ig , numPromotions: 0},
      "Thermae Grimbergen" : { ID: 9, regex: /^(?=.*thermae)(?=.*grimbergen).*$/ig , numPromotions: 0},
      "Thermae Boetfort" : { ID: 10, regex: /^(?=.*boetfort)(?=.*thermae).*$/ig , numPromotions: 0},
      "Sauna De Bron" : { ID: 11, regex: /^(?=.*sauna)(?=.*bron).*$/ig , numPromotions: 0},
      "Sauna Vilt" : { ID: 12, regex: /^(?=.*sauna)(?=.*vilt).*$/ig , numPromotions: 0},
      "Sauna Peize" : { ID: 13, regex: /^(?=.*sauna)(?=.*peize).*$/ig , numPromotions: 0},
      "Sauna Heuvelrug" : { ID: 14, regex: /^(?=.*sauna)(?=.*heuvelrug).*$/ig , numPromotions: 0},
      "Sauna Amstelland" : { ID: 15, regex: /^(?=.*sauna)(?=.*amstelland).*$/ig , numPromotions: 0},
      "Sauna Ridderkerk" : { ID: 16, regex: /^(?=.*sauna)(?=.*ridderkerk).*$/ig , numPromotions: 0},
      "Sauna Epe" : { ID: 17, regex: /^(?=.*sauna)(?=.*epe).*$/ig , numPromotions: 0},
      "Sauna Devarana" : { ID: 18, regex: /devarana/gi , numPromotions: 0},
      "Sauna Thermen 5 Mei" : { ID: 19, regex: /^(?=.*sauna)(?=.*5)(?=.*mei).*$/ig , numPromotions: 0},
      "Spa Wellness Hof Van Saksen": { ID: 20, regex: /^(?=.*hof)(?=.*van)(?=.*saksen).*$/ig , numPromotions: 0},
      "Sauna Thermen Zuidwolde": { ID: 21, regex: /zuidwolde/gi , numPromotions: 0},
      "Sauna Papendrecht": { ID: 22, regex: /^(?=.*sauna)(?=.*papendrecht).*$/ig , numPromotions: 0},
      "Mist City Spa": { ID: 23, regex: /^(?=.*mist)(?=.*city).*$/ig , numPromotions: 0},
      "Descansa": { ID: 24, regex: /descansa/gi , numPromotions: 0},
      "Dennenmarken": { ID: 25, regex: /dennenmarken/gi , numPromotions: 0},
      "Fontana Nieuweschans": { ID: 26, regex: /^(?=.*fontana)(?=.*nieuweschans).*$/ig , numPromotions: 0},
      "Aphrodites Thermen": { ID: 27, regex: /aphrodites/gi , numPromotions: 0},
      "Ons Buiten Oostkapelle": { ID: 28, regex: /^(?=.*ons)(?=.*buiten)(?=.*oostkapelle).*$/ig , numPromotions: 0},
      "Wellness Leiden": { ID: 29, regex: /^(?=.*wellness)(?=.*leiden).*$/ig , numPromotions: 0},
      "Sauna Warmond": { ID: 30, regex: /^(?=.*sauna)(?=.*warmond).*$/ig , numPromotions: 0},
      "Sauna Deco": { ID: 31, regex: /^(?=.*sauna)(?=.*deco).*$/ig , numPromotions: 0},
      "Sauna Centre Haarlem": { ID: 32, regex: /^(?=.*centre)(?=.*haarlem).*$/ig , numPromotions: 0},
      "Sauna Van Egmond Haarlem": { ID: 33, regex: /^(?=.*sauna)(?=.*egmond)(?=.*haarlem).*$/ig , numPromotions: 0},
      "Sauna Den Ilp": { ID: 34, regex: /^(?=.*den)(?=.*ilp).*$/ig , numPromotions: 0},
      "Sauna Het Kuurhuys": { ID: 35, regex: /kuurhuys/gi , numPromotions: 0},
      "Sauna Ridderrode": { ID: 36, regex: /^(?=.*sauna)(?=.*ridderrode).*$/ig , numPromotions: 0},
      "De Sauna Van Diemen": { ID: 37, regex: /^(?=.*sauna)(?=.*diemen).*$/gi , numPromotions: 0},
      "Spa Wellness Chateau St Gerlach": { ID: 38, regex: /^(?=.*chateau)(?=.*gerlach).*$/gi , numPromotions: 0},
      "Vita Allegra": { ID: 39, regex: /^(?=.*vita)(?=.*allegra).*$/gi , numPromotions: 0},
      "Wellnesscentrum Hamam Asselt": { ID: 40, regex: /^(?=.*wellness)(?=.*asselt).*$/gi , numPromotions: 0},
      "Finlandia": { ID: 41, regex: /finlandia/gi , numPromotions: 0},
      "Sauna De Wilder Zwembad De Wilder": { ID: 42, regex: /^(?=.*sauna)(?=.*wilder).*$/gi , numPromotions: 0},
      "Sauna Bolke Gay Sauna": { ID: 43, regex: /^(?=.*bolke)(?=.*sauna).*$/gi , numPromotions: 0},
      "Body Home": { ID: 44, regex: /^(?=.*body)(?=.*home).*$/gi , numPromotions: 0},
      "Sauna Bodycare": { ID: 45, regex: /bodycare/gi , numPromotions: 0},
      "Wilmersberg": { ID: 46, regex: /wilmersberg/gi , numPromotions: 0},
      "Sauna Kontrast": { ID: 47, regex: /^(?=.*sauna)(?=.*kontrast).*$/gi , numPromotions: 0},
      "Spa Wellness Sneek": { ID: 48, regex: /^(?=.*wellness)(?=.*sneek).*$/gi , numPromotions: 0},
      "Sauna Terschelling": { ID: 49, regex: /^(?=.*sauna)(?=.*terschelling).*$/gi , numPromotions: 0},
      "Sauna Loppersum": { ID: 50, regex: /^(?=.*sauna)(?=.*loppersum).*$/gi , numPromotions: 0},
      "Hotel Aan De Wymerts": { ID: 51, regex: /wymerts/gi , numPromotions: 0},
      "Tjaarda Oranjewoud": { ID: 52, regex: /^(?=.*tjaarda)(?=.*oranjewoud).*$/gi , numPromotions: 0},
      "Sauna La Femme": { ID: 53, regex: /lafemme/gi , numPromotions: 0},
      "Wellness Lucia": { ID: 54, regex: /^(?=.*wellness)(?=.*lucia).*$/gi , numPromotions: 0},
      "Sauna Aquarius": { ID: 55, regex: /^(?=.*sauna)(?=.*aquarius).*$/gi , numPromotions: 0},
      "Sauna Helios": { ID: 56, regex: /^(?=.*sauna)(?=.*helios).*$/gi , numPromotions: 0},
      "Beauty Center De Terp": { ID: 57, regex: /^(?=.*beauty)(?=.*terp).*$/gi , numPromotions: 0},
      "Sauna Bad Hesselingen Meppel": { ID: 58, regex: /^(?=.*hesselingen)(?=.*sauna).*$/gi , numPromotions: 0},
      "Sauna Oosterhout": { ID: 59, regex: /^(?=.*sauna)(?=.*oosterhout).*$/gi , numPromotions: 0},
      "Landgoed De Rosep": { ID: 60, regex: /^(?=.*rosep)(?=.*landgoed).*$/gi , numPromotions: 0},
      "Sauna Gieterveen": { ID: 61, regex: /^(?=.*sauna)(?=.*gieterveen).*$/gi , numPromotions: 0},
      "Abdij De Westerburcht": { ID: 62, regex: /^(?=.*abdij)(?=.*westerburcht).*$/gi , numPromotions: 0},
      "Brabant Sauna Haarsteeg": { ID: 63, regex: /^(?=.*haarsteeg)(?=.*sauna).*$/gi , numPromotions: 0},
      "Bron Apart": { ID: 64, regex: /^(?=.*bron)(?=.*apart).*$/gi , numPromotions: 0},
      "Spameland": { ID: 65, regex: /spameland/gi , numPromotions: 0},
      "Float Centrum Zeeland": { ID: 66, regex: /^(?=.*float)(?=.*centrum)(?=.*zeeland).*$/gi , numPromotions: 0},
      "Sauna Franeker": { ID: 67, regex: /franeker/gi , numPromotions: 0},
      "Aquavia": { ID: 68, regex: /aquavia/gi , numPromotions: 0},
      "Thermen En Beauty Zeeland": { ID: 69, regex: /^(?=.*thermen)(?=.*zeeland).*$/gi , numPromotions: 0},
      "Veluwse Bron": { ID: 70, regex: /^(?=.*veluwse)(?=.*bron).*$/gi , numPromotions: 0},
      "Sauna De Bongerd": { ID: 71, regex: /^(?=.*bongerd)(?=.*sauna).*$/gi , numPromotions: 0},
      "Sauna Hotstones": { ID: 72, regex: /^(?=.*sauna)(?=.*hotstones).*$/gi , numPromotions: 0},
      "Thermaalbad Arcen": { ID: 73, regex: /^(?=.*thermaalbad)(?=.*arcen).*$/gi , numPromotions: 0},
      "Thermen Bussloo": { ID: 74, regex: /^(?=.*thermen)(?=.*bussloo).*$/gi , numPromotions: 0},
      "Thermen Holiday": { ID: 75, regex: /^(?=.*thermen)(?=.*holiday).*$/gi , numPromotions: 0},
      "Sauna Soesterberg": { ID: 76, regex: /^(?=.*sauna)(?=.*soesterberg).*$/gi , numPromotions: 0},
      "Sauna Het Friese Woud": { ID: 77, regex: /^(?=.*friese)(?=.*woud).*$/gi , numPromotions: 0},
      "Elysium": { ID: 78, regex: /elysium/gi , numPromotions: 0},
      "Spavarin": { ID: 79, regex: /(?=.*spavarin).*|(?=.*spa)(?=.*savarin).*$/gi , numPromotions: 0},
      "Spa Gouda": { ID: 80, regex: /^(?=.*spa)(?=.*gouda).*$/gi , numPromotions: 0},
      "Wellness 1926": { ID: 81, regex: /^(?=.*wellness)(?=.*1926).*$/gi , numPromotions: 0},
      "Sauna Aestas": { ID: 82, regex: /aestas/gi , numPromotions: 0},
      "Sanadome": { ID: 83, regex: /sanadome/gi , numPromotions: 0},
      "Parkhotel Horst": { ID: 84, regex: /^(?=.*parkhotel)(?=.*horst).*$/gi , numPromotions: 0},
      "Wellness Sittard": { ID: 85, regex: /^(?=.*wellness)(?=.*sittard).*$/gi , numPromotions: 0},
      "Bad Boekelo": { ID: 86, regex: /^(?=.*bad)(?=.*boekelo).*$/gi , numPromotions: 0},
      "Wellness Center De Bronsbergen": { ID: 87, regex: /^(?=.*wellness)(?=.*bronsbergen).*$/gi , numPromotions: 0},
      "Easyfeeling": { ID: 88, regex: /easyfeeling/gi , numPromotions: 0},
      "Welcome Wellness Westcord": { ID: 89, regex: /^(?=.*welcome)(?=.*wellness)(?=.*westcord).*$/gi , numPromotions: 0},
      "Westcord Wtc Hotel Leeuwarden": { ID: 90, regex: /^(?=.*westcord)(?=.*wtc)(?=.*leeuwarden).*$/gi , numPromotions: 0},
      "Hunzebergen": { ID: 91, regex: /hunzebergen/gi , numPromotions: 0},
      "Wellness Helmond": { ID: 92, regex: /^(?=.*wellness)(?=.*helmond).*$/gi , numPromotions: 0},
      "Amadore Kamperduinen": { ID: 93, regex: /^(?=.*amadore)(?=.*kamperduinen).*$/gi , numPromotions: 0},
      "Betuwsch Badhuys": { ID: 94, regex: /^(?=.*betuwsch)(?=.*badhuys).*$/gi , numPromotions: 0},
      "Wellness Goes": { ID: 95, regex: /^(?=.*wellness)(?=.*goes).*$/gi , numPromotions: 0},
      "Het Raedthuys": { ID: 96, regex: /raedthuys/gi , numPromotions: 0},
      "Wellness Roosendaal": { ID: 97, regex: /^(?=.*wellness)(?=.*roosendaal).*$/gi , numPromotions: 0},
      "Zwaluwhoeve": { ID: 98, regex: /zwaluwhoeve/gi , numPromotions: 0},
      "Zuiver Amsterdam": { ID: 99, regex: /zuiver/gi , numPromotions: 0},
      "Caesar Den Haag": { ID: 100, regex: /^(?=.*caesar)(?=.*denhaag).*$/gi , numPromotions: 0},
      "Wellnessboot Mill": { ID: 101, regex: /^(?=.*wellnessboot)(?=.*mill).*$/gi , numPromotions: 0},
      "Spasense": { ID: 102, regex: /spasense/gi , numPromotions: 0},
      "De Woudfennen": { ID: 103, regex: /woudfennen/gi , numPromotions: 0},
      "Thermae 2000": { ID: 104, regex: /^(?=.*thermae)(?=.*2000).*$/gi , numPromotions: 0},
      "Spapuur": { ID: 105, regex: /spapuur|^(?=.*spa)(?=.*puur).*$/gi , numPromotions: 0},
      "Spasereen": { ID: 106, regex: /spasereen/gi , numPromotions: 0},
      "Wellness Trivium": { ID: 107, regex: /^(?=.*wellness)(?=.*trivium).*$/gi , numPromotions: 0},
      "Thermen Goirle": { ID: 108, regex: /^(?=.*thermen)(?=.*goirle).*$/gi , numPromotions: 0},
      "Thermen Born": { ID: 109, regex: /^(?=.*thermen)(?=.*born).*$/gi , numPromotions: 0},
      "Dunya Hamam Eindhoven": { ID: 110, regex: /^(?=.*dunya)(?=.*hamam)(?=.*eindhoven).*$/gi , numPromotions: 0},
      "Thermen La Mer": { ID: 111, regex: /^(?=.*thermen)(?=.*lamer).*$/gi , numPromotions: 0},
      "Thermen Anholts": { ID: 112, regex: /^(?=.*thermen)(?=.*anholts).*$/gi , numPromotions: 0},
      "Thermen Nijmegen": { ID: 113, regex: /^(?=.*thermen)(?=.*nijmegen).*$/gi , numPromotions: 0},
      "Sauna Houten": { ID: 114, regex: /^(?=.*sauna)(?=.*houten).*$/gi , numPromotions: 0},
      "Thermae Son": { ID: 115, regex: /^(?=.*thermae)(?=.*son).*$/gi , numPromotions: 0},
      "Thermen De Waterlelie": { ID: 116, regex: /waterlelie(?!s)/gi , numPromotions: 0},
      "Sauna De Veluwe": { ID: 117, regex: /saunadeveluwe/gi , numPromotions: 0},
      "Sauna Beautyfarm Midwolda": { ID: 118, regex: /midwolda/gi , numPromotions: 0},
      "Sauna Drome Putten": { ID: 119, regex: /^(?=.*dr[oô]me)(?=.*putten).*$/gi , numPromotions: 0},
      "Spa Wellness Weesp": { ID: 120, regex: /^(?=.*weesp)(?=.*spa)(?=.*wellness).*$/gi , numPromotions: 0},
      "Saunastate": { ID: 121, regex: /saunastate/gi , numPromotions: 0},
      "Sauna Velp": { ID: 122, regex: /^(?=.*sauna)(?=.*velp).*$/gi , numPromotions: 0},
      "Beautycentrum De Parel": { ID: 123, regex: /^(?=.*parel)(?=.*beautycentrum).*$/gi , numPromotions: 0},
      "Sauna Leeuwerikhoeve": { ID: 124, regex: /leeuwerikhoeve/gi , numPromotions: 0},
      "Sauna De Leliehof": { ID: 125, regex: /leliehof/gi , numPromotions: 0},
      "Sauna Swoll": { ID: 126, regex: /^(?=.*swoll)(?=.*sauna).*$/gi , numPromotions: 0},
      "Sauna Hoen": { ID: 127, regex: /^(?=.*sauna)(?=.*hoen).*$/gi , numPromotions: 0},
      "Sauna En Beauty Ommen": { ID: 128, regex: /^(?=.*ommen)(?=.*sauna)(?=.*beauty).*$/gi , numPromotions: 0},
      "Sare Thermen Beauty": { ID: 129, regex: /^(?=.*sare)(?=.*thermen).*$/gi , numPromotions: 0},
      "Palestra": { ID: 130, regex: /palestra/gi , numPromotions: 0},
      "Orange Wellness Centre": { ID: 131, regex: /^(?=.*orange)(?=.*wellness)(?=.*centre).*$/gi , numPromotions: 0},
      "Fonteyn Thermen": { ID: 132, regex: /^(?=.*fonteyn)(?=.*thermen).*$/gi , numPromotions: 0},
      "De Thermen": { ID: 133, regex: /dethermen/gi , numPromotions: 0},
      "Centre Du Lac": { ID: 134, regex: /^(?=.*centre)(?=.*du)(?=.*lac).*$/gi , numPromotions: 0},
      "Sauna Beauty Oase Senang": { ID: 135, regex: /^(?=.*senang)(?=.*sauna)(?=.*oase).*$/gi , numPromotions: 0},
      "Top Alivio": { ID: 136, regex: /^(?=.*top)(?=.*alivio).*$/i , numPromotions: 0},
      "Sauna Suomi": { ID: 137, regex: /^(?=.*sauna)(?=.*suomi).*$/i , numPromotions: 0},
      "Sauna Nijverdal": { ID: 138, regex: /^(?=.*sauna)(?=.*nijverdal).*$/i , numPromotions: 0},
      "Spabron Hesselerbrug": { ID: 139, regex: /hesselerbrug/i , numPromotions: 0},
    };

    const campaigns = {
            4179: {
                name: 'VakantieVeilingen',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/vakantieveilignen-5.png'
            },
            11136: {
                name: 'SpaOnline.com',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2015/12/Spaonline.jpg'
            },
            10456: {
                name: 'ActievandeDag',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/actievandedag-logo.png'
            },
            8308: {
                name: 'TicketVeiling',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/ticketveiling-logo.jpeg'
            },
            26224: {
                name: 'Tripper',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/tripper-logo.jpeg'
            },
            686: {
                name: 'HotelSpecials',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2020/02/hotelspecials-logo.jpg'
            },
            34295: {
                name: 'Voordeeluitjes.nl',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2020/02/voordeeluitjes-logo.png'
            },
            2301: {
                name: 'ZoWeg',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/zoweg-logo.jpg'
            },
            13048: {
                name: 'AD Webwinkel',
                image: 'https://wellnesscentrumnederland.nl/wp-content/uploads/2020/02/ad-webwinkel-logo.png'
            },
        };

    /* src/Filter.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$4 = "src/Filter.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i][0];
    	child_ctx[11] = list[i][1].numPromotions;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i][0];
    	child_ctx[10] = list[i][1].name;
    	return child_ctx;
    }

    // (70:12) {#each campaignsArray as [campaignID, {name}
    function create_each_block_1(ctx) {
    	let option;
    	let t0_value = /*name*/ ctx[10] + "";
    	let t0;
    	let t1;
    	let t2_value = /*numPromotionsForFilter*/ ctx[2][/*name*/ ctx[10]] + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			option.__value = /*campaignID*/ ctx[14];
    			option.value = option.__value;
    			add_location(option, file$4, 70, 16, 2661);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*numPromotionsForFilter*/ 4 && t2_value !== (t2_value = /*numPromotionsForFilter*/ ctx[2][/*name*/ ctx[10]] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(70:12) {#each campaignsArray as [campaignID, {name}",
    		ctx
    	});

    	return block;
    }

    // (80:12) {#each wellnessArray as [name,{numPromotions}
    function create_each_block$1(ctx) {
    	let option;
    	let t0_value = /*name*/ ctx[10] + "";
    	let t0;
    	let t1;
    	let t2_value = /*numPromotions*/ ctx[11] + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			option.__value = /*name*/ ctx[10];
    			option.value = option.__value;
    			add_location(option, file$4, 80, 16, 3033);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(80:12) {#each wellnessArray as [name,{numPromotions}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let label0;
    	let b0;
    	let t1;
    	let select0;
    	let option0;
    	let t2;
    	let t3_value = /*numPromotionsForFilter*/ ctx[2].all + "";
    	let t3;
    	let t4;
    	let t5;
    	let label1;
    	let b1;
    	let t7;
    	let select1;
    	let option1;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*campaignsArray*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*wellnessArray*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			label0 = element("label");
    			b0 = element("b");
    			b0.textContent = "Selecteer een campagne:";
    			t1 = space();
    			select0 = element("select");
    			option0 = element("option");
    			t2 = text("Alle (");
    			t3 = text(t3_value);
    			t4 = text(")");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			label1 = element("label");
    			b1 = element("b");
    			b1.textContent = "Selecteer een wellness:";
    			t7 = space();
    			select1 = element("select");
    			option1 = element("option");
    			option1.textContent = "Alle";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(b0, file$4, 66, 8, 2409);
    			option0.__value = "all";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 68, 12, 2521);
    			attr_dev(select0, "class", "form-select");
    			if (/*selectedCampaignID*/ ctx[0] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[5].call(select0));
    			add_location(select0, file$4, 67, 8, 2448);
    			add_location(label0, file$4, 65, 4, 2393);
    			add_location(b1, file$4, 76, 8, 2813);
    			option1.__value = "all";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 78, 12, 2923);
    			attr_dev(select1, "class", "form-select");
    			if (/*selectedWellness*/ ctx[1] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[6].call(select1));
    			add_location(select1, file$4, 77, 8, 2852);
    			add_location(label1, file$4, 75, 4, 2797);
    			attr_dev(div, "class", "filter svelte-10ydn6o");
    			add_location(div, file$4, 64, 0, 2368);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label0);
    			append_dev(label0, b0);
    			append_dev(label0, t1);
    			append_dev(label0, select0);
    			append_dev(select0, option0);
    			append_dev(option0, t2);
    			append_dev(option0, t3);
    			append_dev(option0, t4);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*selectedCampaignID*/ ctx[0], true);
    			append_dev(div, t5);
    			append_dev(div, label1);
    			append_dev(label1, b1);
    			append_dev(label1, t7);
    			append_dev(label1, select1);
    			append_dev(select1, option1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*selectedWellness*/ ctx[1], true);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[5]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*numPromotionsForFilter*/ 4 && t3_value !== (t3_value = /*numPromotionsForFilter*/ ctx[2].all + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*campaignsArray, numPromotionsForFilter*/ 12) {
    				each_value_1 = /*campaignsArray*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*selectedCampaignID, campaignsArray*/ 9) {
    				select_option(select0, /*selectedCampaignID*/ ctx[0]);
    			}

    			if (dirty & /*wellnessArray*/ 16) {
    				each_value = /*wellnessArray*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selectedWellness, wellnessArray*/ 18) {
    				select_option(select1, /*selectedWellness*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Filter', slots, []);
    	let numMatchedPromotionsOnSite = 0;
    	const matchedPromotions = [];

    	mappedPromotions.forEach(promotion => {
    		Object.entries(wellnessListIDs).map(([wellnessName, wellnessData]) => {
    			if (wellnessData.regex.test(promotion.title)) {
    				wellnessData.numPromotions += 1;
    				numMatchedPromotionsOnSite += 1;
    				if (!matchedPromotions.includes(wellnessName)) matchedPromotions.push(wellnessName);
    			}

    			return wellnessName;
    		});
    	});

    	console.log('numMatchedPromotionsOnSite: ', numMatchedPromotionsOnSite);
    	console.log(matchedPromotions);
    	const dispatch = createEventDispatcher();
    	const campaignsArray = Object.entries(campaigns);
    	let wellnessArray = Object.entries(wellnessListIDs);

    	//to sort the wellness centres inside the Filter, starting with the ones that have promotions
    	wellnessArray.sort((a, b) => b[1].numPromotions - a[1].numPromotions);

    	let selectedCampaignID;
    	let selectedWellness;

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
    		'Voordeeluitjes.nl': 0
    	};

    	mappedPromotions.forEach(promotion => {
    		//console.log(campaigns[promotion.campaignID].name)
    		$$invalidate(2, numPromotionsForFilter[campaigns[promotion.campaignID].name] += 1, numPromotionsForFilter);
    	});

    	console.log(numPromotionsForFilter);
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Filter> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		selectedCampaignID = select_value(this);
    		$$invalidate(0, selectedCampaignID);
    		$$invalidate(3, campaignsArray);
    	}

    	function select1_change_handler() {
    		selectedWellness = select_value(this);
    		$$invalidate(1, selectedWellness);
    		$$invalidate(4, wellnessArray);
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		campaigns,
    		wellnessListIDs,
    		mappedPromotions,
    		numMatchedPromotionsOnSite,
    		matchedPromotions,
    		dispatch,
    		campaignsArray,
    		wellnessArray,
    		selectedCampaignID,
    		selectedWellness,
    		numPromotionsForFilter
    	});

    	$$self.$inject_state = $$props => {
    		if ('numMatchedPromotionsOnSite' in $$props) numMatchedPromotionsOnSite = $$props.numMatchedPromotionsOnSite;
    		if ('wellnessArray' in $$props) $$invalidate(4, wellnessArray = $$props.wellnessArray);
    		if ('selectedCampaignID' in $$props) $$invalidate(0, selectedCampaignID = $$props.selectedCampaignID);
    		if ('selectedWellness' in $$props) $$invalidate(1, selectedWellness = $$props.selectedWellness);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedCampaignID, selectedWellness*/ 3) {
    			{
    				dispatch('filter', {
    					campaignID: selectedCampaignID,
    					wellness: selectedWellness
    				});
    			}
    		}
    	};

    	return [
    		selectedCampaignID,
    		selectedWellness,
    		numPromotionsForFilter,
    		campaignsArray,
    		wellnessArray,
    		select0_change_handler,
    		select1_change_handler
    	];
    }

    class Filter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Filter",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/priceComponent.svelte generated by Svelte v3.59.2 */

    const file$3 = "src/priceComponent.svelte";

    function create_fragment$3(ctx) {
    	let div4;
    	let div2;
    	let div0;
    	let t0_value = (/*oldPrice*/ ctx[0] ? /*oldPrice*/ ctx[0] : "") + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let div1_style_value;
    	let t3;
    	let div3;
    	let t4_value = (/*discount*/ ctx[2] ? /*discount*/ ctx[2] : "") + "";
    	let t4;
    	let div3_class_value;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*newPrice*/ ctx[1]);
    			t3 = space();
    			div3 = element("div");
    			t4 = text(t4_value);
    			attr_dev(div0, "class", "old svelte-og8q6m");
    			toggle_class(div0, "hidden", /*oldPrice*/ ctx[0] == "€0,-");
    			add_location(div0, file$3, 8, 8, 159);
    			attr_dev(div1, "class", "new svelte-og8q6m");

    			attr_dev(div1, "style", div1_style_value = /*discount*/ ctx[2]
    			? 'background-color: transparent'
    			: '');

    			add_location(div1, file$3, 11, 8, 271);
    			attr_dev(div2, "class", "new-discount svelte-og8q6m");
    			add_location(div2, file$3, 7, 4, 124);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty(/*discount*/ ctx[2] ? 'discount' : '') + " svelte-og8q6m"));
    			toggle_class(div3, "hidden", /*oldPrice*/ ctx[0] == "€0,-");
    			add_location(div3, file$3, 15, 4, 397);
    			attr_dev(div4, "class", "price-info svelte-og8q6m");
    			add_location(div4, file$3, 6, 0, 95);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*oldPrice*/ 1 && t0_value !== (t0_value = (/*oldPrice*/ ctx[0] ? /*oldPrice*/ ctx[0] : "") + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*oldPrice*/ 1) {
    				toggle_class(div0, "hidden", /*oldPrice*/ ctx[0] == "€0,-");
    			}

    			if (dirty & /*newPrice*/ 2) set_data_dev(t2, /*newPrice*/ ctx[1]);

    			if (dirty & /*discount*/ 4 && div1_style_value !== (div1_style_value = /*discount*/ ctx[2]
    			? 'background-color: transparent'
    			: '')) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			if (dirty & /*discount*/ 4 && t4_value !== (t4_value = (/*discount*/ ctx[2] ? /*discount*/ ctx[2] : "") + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*discount*/ 4 && div3_class_value !== (div3_class_value = "" + (null_to_empty(/*discount*/ ctx[2] ? 'discount' : '') + " svelte-og8q6m"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty & /*discount, oldPrice*/ 5) {
    				toggle_class(div3, "hidden", /*oldPrice*/ ctx[0] == "€0,-");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PriceComponent', slots, []);
    	let { oldPrice } = $$props;
    	let { newPrice } = $$props;
    	let { discount } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (oldPrice === undefined && !('oldPrice' in $$props || $$self.$$.bound[$$self.$$.props['oldPrice']])) {
    			console.warn("<PriceComponent> was created without expected prop 'oldPrice'");
    		}

    		if (newPrice === undefined && !('newPrice' in $$props || $$self.$$.bound[$$self.$$.props['newPrice']])) {
    			console.warn("<PriceComponent> was created without expected prop 'newPrice'");
    		}

    		if (discount === undefined && !('discount' in $$props || $$self.$$.bound[$$self.$$.props['discount']])) {
    			console.warn("<PriceComponent> was created without expected prop 'discount'");
    		}
    	});

    	const writable_props = ['oldPrice', 'newPrice', 'discount'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PriceComponent> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('oldPrice' in $$props) $$invalidate(0, oldPrice = $$props.oldPrice);
    		if ('newPrice' in $$props) $$invalidate(1, newPrice = $$props.newPrice);
    		if ('discount' in $$props) $$invalidate(2, discount = $$props.discount);
    	};

    	$$self.$capture_state = () => ({ oldPrice, newPrice, discount });

    	$$self.$inject_state = $$props => {
    		if ('oldPrice' in $$props) $$invalidate(0, oldPrice = $$props.oldPrice);
    		if ('newPrice' in $$props) $$invalidate(1, newPrice = $$props.newPrice);
    		if ('discount' in $$props) $$invalidate(2, discount = $$props.discount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [oldPrice, newPrice, discount];
    }

    class PriceComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { oldPrice: 0, newPrice: 1, discount: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PriceComponent",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get oldPrice() {
    		throw new Error("<PriceComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set oldPrice(value) {
    		throw new Error("<PriceComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get newPrice() {
    		throw new Error("<PriceComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set newPrice(value) {
    		throw new Error("<PriceComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get discount() {
    		throw new Error("<PriceComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set discount(value) {
    		throw new Error("<PriceComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Card.svelte generated by Svelte v3.59.2 */
    const file$2 = "src/Card.svelte";

    // (40:24) {#if location && (typeof location !== 'object' || (Array.isArray(location) && location.length > 0))}
    function create_if_block$1(ctx) {
    	let p;
    	let i;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			i = element("i");
    			t0 = space();
    			t1 = text(/*location*/ ctx[0]);
    			attr_dev(i, "class", "fas fa-map-marker svelte-59oqqi");
    			add_location(i, file$2, 40, 58, 1858);
    			attr_dev(p, "class", "promotion-location svelte-59oqqi");
    			add_location(p, file$2, 40, 28, 1828);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, i);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*location*/ 1) set_data_dev(t1, /*location*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(40:24) {#if location && (typeof location !== 'object' || (Array.isArray(location) && location.length > 0))}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let a1;
    	let div5;
    	let div4;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div2;
    	let h5;
    	let t2;
    	let div1;
    	let show_if = /*location*/ ctx[0] && (typeof /*location*/ ctx[0] !== 'object' || Array.isArray(/*location*/ ctx[0]) && /*location*/ ctx[0].length > 0);
    	let t3;
    	let pricecomponent;
    	let t4;
    	let div3;
    	let a0;
    	let button;
    	let span;
    	let t6;
    	let img1;
    	let img1_src_value;
    	let current;
    	let if_block = show_if && create_if_block$1(ctx);

    	pricecomponent = new PriceComponent({
    			props: {
    				oldPrice: /*oldPrice*/ ctx[1],
    				newPrice: /*newPrice*/ ctx[2],
    				discount: /*discount*/ ctx[3],
    				campaignID: /*campaignID*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			a1 = element("a");
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div2 = element("div");
    			h5 = element("h5");
    			h5.textContent = `${/*title*/ ctx[6]}`;
    			t2 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t3 = space();
    			create_component(pricecomponent.$$.fragment);
    			t4 = space();
    			div3 = element("div");
    			a0 = element("a");
    			button = element("button");
    			span = element("span");
    			span.textContent = "Bekijk actie";
    			t6 = space();
    			img1 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = campaigns[/*campaignID*/ ctx[5]].image)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", `logo ${campaigns[/*campaignID*/ ctx[5]].name}`);
    			add_location(img0, file$2, 35, 34, 1433);
    			attr_dev(div0, "class", "logo svelte-59oqqi");
    			add_location(div0, file$2, 35, 16, 1415);
    			attr_dev(h5, "class", "promotion-title svelte-59oqqi");
    			add_location(h5, file$2, 37, 20, 1589);
    			attr_dev(div1, "class", "extra-info svelte-59oqqi");
    			add_location(div1, file$2, 38, 20, 1650);
    			attr_dev(div2, "class", "promotion-info svelte-59oqqi");
    			add_location(div2, file$2, 36, 16, 1540);
    			attr_dev(span, "class", "svelte-59oqqi");
    			add_location(span, file$2, 46, 58, 2169);
    			attr_dev(button, "class", "svelte-59oqqi");
    			add_location(button, file$2, 46, 50, 2161);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "href", /*url*/ ctx[4]);
    			add_location(a0, file$2, 46, 20, 2131);
    			if (!src_url_equal(img1.src, img1_src_value = "https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/pijl2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Call to action pijl");
    			attr_dev(img1, "class", "svelte-59oqqi");
    			add_location(img1, file$2, 47, 20, 2228);
    			attr_dev(div3, "class", "cta svelte-59oqqi");
    			add_location(div3, file$2, 45, 16, 2093);
    			attr_dev(div4, "class", "promotion-body svelte-59oqqi");
    			add_location(div4, file$2, 34, 12, 1370);
    			attr_dev(div5, "class", "promotion svelte-59oqqi");
    			add_location(div5, file$2, 33, 8, 1334);
    			attr_dev(a1, "href", /*url*/ ctx[4]);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "title", `Korting ${campaigns[/*campaignID*/ ctx[5]].name}`);
    			set_style(a1, "display", /*show*/ ctx[7] ? "block" : "none");
    			attr_dev(a1, "class", "promotion-link svelte-59oqqi");
    			add_location(a1, file$2, 32, 4, 1181);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a1, anchor);
    			append_dev(a1, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, img0);
    			append_dev(div4, t0);
    			append_dev(div4, div2);
    			append_dev(div2, h5);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t3);
    			mount_component(pricecomponent, div1, null);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, a0);
    			append_dev(a0, button);
    			append_dev(button, span);
    			append_dev(div3, t6);
    			append_dev(div3, img1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*location*/ 1) show_if = /*location*/ ctx[0] && (typeof /*location*/ ctx[0] !== 'object' || Array.isArray(/*location*/ ctx[0]) && /*location*/ ctx[0].length > 0);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const pricecomponent_changes = {};
    			if (dirty & /*oldPrice*/ 2) pricecomponent_changes.oldPrice = /*oldPrice*/ ctx[1];
    			if (dirty & /*newPrice*/ 4) pricecomponent_changes.newPrice = /*newPrice*/ ctx[2];
    			if (dirty & /*discount*/ 8) pricecomponent_changes.discount = /*discount*/ ctx[3];
    			pricecomponent.$set(pricecomponent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pricecomponent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pricecomponent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a1);
    			if (if_block) if_block.d();
    			destroy_component(pricecomponent);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function numToEuroString(num) {
    	return (/\./).test(num.toString())
    	? "€" + num.toFixed(2).replace(".", ",")
    	: "€" + num + ",-";
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Card', slots, []);
    	let { promotion } = $$props;
    	let { currentWellness } = $$props;
    	let { url, campaignID, title, location, oldPrice, newPrice, wellnessName } = promotion;
    	let show = currentWellness === wellnessName ? true : false;
    	let discount;
    	if ((campaignID == 4179 || campaignID == 8308) && (newPrice == 1 || newPrice == 0)) newPrice = "v.a. €1,-";

    	if (campaignID == 11136 || campaignID == 10456 || campaignID == 26224 || campaignID == 13048 || campaignID == 686 || campaignID == 2301) {
    		if (oldPrice && newPrice) {
    			discount = Math.round((newPrice - oldPrice) / oldPrice * 100) * -1;
    			discount = discount + '% korting!';
    			oldPrice = numToEuroString(oldPrice);
    			newPrice = numToEuroString(newPrice);
    		} else if (!oldPrice && newPrice) {
    			newPrice = numToEuroString(newPrice);
    		}
    	}
    	if ((/\|/).test(location)) location = location.replace(/\|.*/, "");

    	$$self.$$.on_mount.push(function () {
    		if (promotion === undefined && !('promotion' in $$props || $$self.$$.bound[$$self.$$.props['promotion']])) {
    			console.warn("<Card> was created without expected prop 'promotion'");
    		}

    		if (currentWellness === undefined && !('currentWellness' in $$props || $$self.$$.bound[$$self.$$.props['currentWellness']])) {
    			console.warn("<Card> was created without expected prop 'currentWellness'");
    		}
    	});

    	const writable_props = ['promotion', 'currentWellness'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('promotion' in $$props) $$invalidate(8, promotion = $$props.promotion);
    		if ('currentWellness' in $$props) $$invalidate(9, currentWellness = $$props.currentWellness);
    	};

    	$$self.$capture_state = () => ({
    		campaigns,
    		PriceComponent,
    		promotion,
    		currentWellness,
    		url,
    		campaignID,
    		title,
    		location,
    		oldPrice,
    		newPrice,
    		wellnessName,
    		show,
    		discount,
    		numToEuroString
    	});

    	$$self.$inject_state = $$props => {
    		if ('promotion' in $$props) $$invalidate(8, promotion = $$props.promotion);
    		if ('currentWellness' in $$props) $$invalidate(9, currentWellness = $$props.currentWellness);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('campaignID' in $$props) $$invalidate(5, campaignID = $$props.campaignID);
    		if ('title' in $$props) $$invalidate(6, title = $$props.title);
    		if ('location' in $$props) $$invalidate(0, location = $$props.location);
    		if ('oldPrice' in $$props) $$invalidate(1, oldPrice = $$props.oldPrice);
    		if ('newPrice' in $$props) $$invalidate(2, newPrice = $$props.newPrice);
    		if ('wellnessName' in $$props) wellnessName = $$props.wellnessName;
    		if ('show' in $$props) $$invalidate(7, show = $$props.show);
    		if ('discount' in $$props) $$invalidate(3, discount = $$props.discount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		location,
    		oldPrice,
    		newPrice,
    		discount,
    		url,
    		campaignID,
    		title,
    		show,
    		promotion,
    		currentWellness
    	];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { promotion: 8, currentWellness: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get promotion() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set promotion(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentWellness() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentWellness(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Card2.svelte generated by Svelte v3.59.2 */
    const file$1 = "src/Card2.svelte";

    // (17:8) {#if location && (typeof location !== 'object' || (Array.isArray(location) && location.length > 0))}
    function create_if_block(ctx) {
    	let p;
    	let i;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			i = element("i");
    			t0 = space();
    			t1 = text(/*location*/ ctx[0]);
    			attr_dev(i, "class", "fas fa-map-marker svelte-ud3qc2");
    			add_location(i, file$1, 17, 42, 735);
    			attr_dev(p, "class", "promotion-location svelte-ud3qc2");
    			add_location(p, file$1, 17, 12, 705);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, i);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*location*/ 1) set_data_dev(t1, /*location*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(17:8) {#if location && (typeof location !== 'object' || (Array.isArray(location) && location.length > 0))}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div4;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let h5;
    	let t2;
    	let show_if = /*location*/ ctx[0] && (typeof /*location*/ ctx[0] !== 'object' || Array.isArray(/*location*/ ctx[0]) && /*location*/ ctx[0].length > 0);
    	let t3;
    	let div3;
    	let a;
    	let div2;
    	let button;
    	let span;
    	let t5;
    	let img1;
    	let img1_src_value;
    	let if_block = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			h5 = element("h5");
    			h5.textContent = `${/*title*/ ctx[2]}`;
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			div3 = element("div");
    			a = element("a");
    			div2 = element("div");
    			button = element("button");
    			span = element("span");
    			span.textContent = "Bekijk aanbieding";
    			t5 = space();
    			img1 = element("img");
    			attr_dev(img0, "loading", "lazy");
    			attr_dev(img0, "class", "promotion-img-top svelte-ud3qc2");
    			if (!src_url_equal(img0.src, img0_src_value = /*image*/ ctx[1])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", `Bekijk de promotie ${/*title*/ ctx[2]}`);
    			add_location(img0, file$1, 12, 8, 344);
    			attr_dev(div0, "class", "img-wrapper svelte-ud3qc2");
    			add_location(div0, file$1, 11, 4, 310);
    			attr_dev(h5, "class", "promotion-title svelte-ud3qc2");
    			add_location(h5, file$1, 15, 8, 543);
    			attr_dev(div1, "class", "promotion-body svelte-ud3qc2");
    			set_style(div1, "background-image", "url(" + /*logoCampaignURL*/ ctx[4] + ")");
    			add_location(div1, file$1, 14, 4, 456);
    			attr_dev(span, "class", "svelte-129k69g svelte-ud3qc2");
    			add_location(span, file$1, 23, 47, 974);
    			attr_dev(button, "class", "svelte-129k69g svelte-ud3qc2");
    			add_location(button, file$1, 23, 16, 943);
    			if (!src_url_equal(img1.src, img1_src_value = "https://wellnesscentrumnederland.nl/wp-content/uploads/2023/07/pijl2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Call to action pijl");
    			attr_dev(img1, "class", "svelte-129k69g svelte-ud3qc2");
    			add_location(img1, file$1, 24, 16, 1053);
    			attr_dev(div2, "class", "button-container svelte-ud3qc2");
    			add_location(div2, file$1, 22, 12, 896);
    			attr_dev(a, "href", /*url*/ ctx[3]);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$1, 21, 8, 853);
    			attr_dev(div3, "class", "promotion-footer svelte-ud3qc2");
    			add_location(div3, file$1, 20, 4, 814);
    			attr_dev(div4, "class", "promotion svelte-ud3qc2");
    			add_location(div4, file$1, 10, 0, 282);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, img0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div1, h5);
    			append_dev(div1, t2);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, a);
    			append_dev(a, div2);
    			append_dev(div2, button);
    			append_dev(button, span);
    			append_dev(div2, t5);
    			append_dev(div2, img1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*location*/ 1) show_if = /*location*/ ctx[0] && (typeof /*location*/ ctx[0] !== 'object' || Array.isArray(/*location*/ ctx[0]) && /*location*/ ctx[0].length > 0);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Card2', slots, []);
    	let { promotion } = $$props;
    	let { image, title, location, url, campaignID } = promotion;
    	let logoCampaignURL = campaigns[campaignID].image;
    	if ((/\|/).test(location)) location = location.replace(/\|.*/, "");

    	$$self.$$.on_mount.push(function () {
    		if (promotion === undefined && !('promotion' in $$props || $$self.$$.bound[$$self.$$.props['promotion']])) {
    			console.warn("<Card2> was created without expected prop 'promotion'");
    		}
    	});

    	const writable_props = ['promotion'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Card2> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('promotion' in $$props) $$invalidate(5, promotion = $$props.promotion);
    	};

    	$$self.$capture_state = () => ({
    		campaigns,
    		promotion,
    		image,
    		title,
    		location,
    		url,
    		campaignID,
    		logoCampaignURL
    	});

    	$$self.$inject_state = $$props => {
    		if ('promotion' in $$props) $$invalidate(5, promotion = $$props.promotion);
    		if ('image' in $$props) $$invalidate(1, image = $$props.image);
    		if ('title' in $$props) $$invalidate(2, title = $$props.title);
    		if ('location' in $$props) $$invalidate(0, location = $$props.location);
    		if ('url' in $$props) $$invalidate(3, url = $$props.url);
    		if ('campaignID' in $$props) campaignID = $$props.campaignID;
    		if ('logoCampaignURL' in $$props) $$invalidate(4, logoCampaignURL = $$props.logoCampaignURL);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [location, image, title, url, logoCampaignURL, promotion];
    }

    class Card2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { promotion: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card2",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get promotion() {
    		throw new Error("<Card2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set promotion(value) {
    		throw new Error("<Card2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (42:3) {#each promotions as promotion (promotion.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				promotion: /*promotion*/ ctx[6],
    				currentWellness: /*currentWellness*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(card.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const card_changes = {};
    			if (dirty & /*promotions*/ 1) card_changes.promotion = /*promotion*/ ctx[6];
    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(42:3) {#each promotions as promotion (promotion.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*promotions*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*promotion*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "container svelte-11n8ewm");
    			add_location(div, file, 38, 1, 1305);
    			attr_dev(main, "class", "svelte-11n8ewm");
    			add_location(main, file, 37, 0, 1297);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*promotions, currentWellness*/ 3) {
    				each_value = /*promotions*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let svelteAppElement = document.getElementById('svelte-app');
    	let currentWellness = svelteAppElement.dataset.wellnessid;
    	mappedPromotions.sort((a, b) => a.title.localeCompare(b.title));
    	let selectedCampaignID;
    	let selectedWellness;
    	let promotions = [];

    	function handleFilter(event) {
    		$$invalidate(2, selectedCampaignID = event.detail.campaignID);
    		$$invalidate(3, selectedWellness = event.detail.wellness);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		mappedPromotions,
    		wellnessListIDs,
    		Filter,
    		Card,
    		Card2,
    		svelteAppElement,
    		currentWellness,
    		selectedCampaignID,
    		selectedWellness,
    		promotions,
    		handleFilter
    	});

    	$$self.$inject_state = $$props => {
    		if ('svelteAppElement' in $$props) svelteAppElement = $$props.svelteAppElement;
    		if ('currentWellness' in $$props) $$invalidate(1, currentWellness = $$props.currentWellness);
    		if ('selectedCampaignID' in $$props) $$invalidate(2, selectedCampaignID = $$props.selectedCampaignID);
    		if ('selectedWellness' in $$props) $$invalidate(3, selectedWellness = $$props.selectedWellness);
    		if ('promotions' in $$props) $$invalidate(0, promotions = $$props.promotions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedCampaignID, selectedWellness*/ 12) {
    			{
    				$$invalidate(0, promotions = mappedPromotions);

    				if (selectedCampaignID && selectedCampaignID !== 'all') {
    					$$invalidate(0, promotions = mappedPromotions.filter(promotion => promotion.campaignID == selectedCampaignID));
    				}

    				if (selectedWellness && selectedWellness !== 'all') {
    					$$invalidate(0, promotions = mappedPromotions.filter(promotion => wellnessListIDs[selectedWellness].regex.test(promotion.title)));
    				}
    			}
    		}
    	};

    	return [promotions, currentWellness, selectedCampaignID, selectedWellness];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.getElementById('svelte-app')
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
