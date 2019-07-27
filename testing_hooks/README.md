# Testování hooků.
Když se člověk podívá na hook funkci a přemýšlí o jejím testování, tak se na první pohled zdá všechno růžové. Vždyť 
přeci máme funkci, která vrací hodnoty. Takže jí prostě jen zavoláme a návratové hodnoty otestujeme. Po prvním 
takovémhle pokusu, ale dostaneme vyhubováno s hláškou: **Hooks could be used only in Render method**.

## Vysvětlení
Tato hláška vycházi z podstaty hooků. Neboť ty jsou vázány na komponentu, její životí cycklus a její stav v podobě 
ctx, což je místo, kde hooky žijí.

## Example hook
Funkcionalita, kterou chceme otestovat je jednoduchá. Jedná se o hook, který bude umět přičítat.
```typescript
export function useCounter(initialCount = 0): ICounter {
    const [count, setCount] = b.useState(initialCount);
    function increment() {
        setCount(count => count + 1);
    }

    return {
        count,
        increment
    }
}
```
Víme, že hook musíme použít v renderu.
```typescript jsx
function Component() {
    const counter = useCounter();
    return <div>{counter.count}</div>
}
```
Hodnota je ale nyní dostupná pouze uvnitř render funkce. Zavedeme tedy proměnnou mimo scope render funkce, do které 
budeme hodnoty přiřazovat a následně expectovat a komponentu potřebujeme ještě nechat sestavit bobrilem. Init je zde 
pro přidání root nodu a syncUpdate pro synchronní render.
```typescript jsx
 it("naive init", () => {
         let currentValue: ICounter;
         function Component() {
             currentValue = useCounter();
             return <div>{currentValue.count}</div>
         }
         b.init(() => <Component/>);
         b.syncUpdate();
         expect(currentValue.count).toBe(0);
     });
```
Máme procházející test na první render. Co ale když chceme zavolat funkci poskytovanou hookem?
```typescript jsx
it("naive increment", () => {
    let currentValue: ICounter;
    function Component() {
        currentValue = useCounter();
        return <div>{currentValue.count}</div>
    }
    
    b.init(() => <Component/>);
    b.syncUpdate();
    currentValue.increment();
    expect(currentValue.count).toBe(1)
});
```
Funkce se zavolala. Stav se změnil. Došlo k zavolání invalidatu. Nicméně hodnota poskytovaná counterem stále není 
aktuální, neboť nedošlo k překreslení komponenty. To je naplánováno do budoucna, ale mi ho potřebujeme hned. Bobrilu 
je tedy nutné znovu řící o render

```typescript jsx
    it("naive increment", () => {
        let currentValue: ICounter;
        function Component() {
            currentValue = useCounter();
            return <div>{currentValue.count}</div>
        }
        
        b.init(() => <Component/>);
        b.syncUpdate();
        currentValue.increment();
        b.syncUpdate();
        expect(currentValue.count).toBe(1)
    });
```
Úderné duo invalidate a syncUpdate se  v budoucnu bude ještě hodit. Tak toto volání schovám za funkci pojmenovanou 
rerender. 
```typescript jsx
export function rerender() {
    b.invalidate();
    b.syncUpdate();
}
```

## Generičtější řešení pro počítadlo
V každém testu se nám opakuje inicializace, definice komponenty samotné a volání syncUpdate. To by s přibývajícími 
testy začlo nepříjemně narůstat a schovávalo by to pravý záměr testovacích metod. Nejdříve tedy generická funkce pro 
inicializaci componenty a navrácení hodnoty hooku.

Jelikož je prepare funkce definovaná mimo scope obou testů, musíme najít jinou cestu, jak do testu dostat hodnotu pro expectovani. Tou je navrácení referenční 
hodnoty, která je updatovaná v každém renderu.
```typescript jsx
function prepare() {
    let currentValue = {} as ICounter;
    function Component() {
        Object.assign(currentValue, useCounter());
        return <div>{currentValue.count}</div>
    }
    b.init(() => <Component/>);
    b.syncUpdate();
    return currentValue;
}
it("prepare init", () => {
    const currentValue = prepare();
    expect(currentValue.count).toBe(0);
});

it("prepare increment", () => {
    const currentValue = prepare();
    currentValue.increment();
    b.syncUpdate();
    expect(currentValue.count).toBe(1)
});
```

## Složitější problémy
Pokud má hook pouze takto závislost na stav. Řešení je přímočaré. Ale co když potřebujeme provádět side effekty v 
podobě interakce s prosředím? Jako je například schedulování tásků.
```typescript jsx
export function useInterval(callback: () => void, delay: number): void {
    const savedCallback = useRef<() => void>();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        const id = setInterval(() => savedCallback.current(), delay);
        return () => clearInterval(id);
    }, [delay]);
}
```
Co se testovatelnosti tohoto hooku týče, první test, který nás napadne, je zkontrolovat, že useInterval po 
specifikovaném intervalu opravdu zavolá poskytnutý callback. Nejdříve definujme prepare funkci
```typescript jsx
function prepareInterval(callback, time) {
    function Component() {
        useInterval(callback, time);
        return <div>Test</div>
    }
    b.init(() => <Component/>);
    b.syncUpdate();
}
```
a použití
```typescript jsx
describe("useInterval prepare", () => {
    it("prepare init", () => {
        const cb = jasmine.createSpy("callback");
        prepareInterval(cb, 12);
        
        // after ms
        expect(cb).toHaveBeenCalled();
    });
});

```
 Další z věcí co zbývá dořešit je posun na časové ose. O to se nám postárá jasmine se svýma helper funkceme které 
 jsou k dostání po zavolání jasmine.Clock funkce viz: [documentace](https://jasmine.github.io/api/3.4/Clock.html). 
 Vyřešil se jeden problém a vyskočil na nás další. UseEffect funkce totiž není synchronní. Je vykonávána jakmile to 
 bude možné. V bobrilu na toto existuje pomocná funkce asap. Budeme tedy potřebovat tool který dokáže říct zda se již zavolal effekt uvnitř 
komponenty. Effekt funkce využívá asap funkci. Tak proč né vyrobený tool. Definujeme funkci, která bude čekat na 
výkon effectFunkce.
```typescript jsx
function afterEffect() {
     return new Promise(resolve => b.asap(resolve))
 }
```
S promisy se celý test stává asynchronní. Další s čím by tooling měl počítat je možnost v průběhu času měnit 
závislosti hooku. V tomto případě změna callbacku, respektive timeru, aby jsme mohli zkontrolovat, že se hook
 chová korektně i za těchto případů. Do prepare funkce budeme tedy potřebovat udělat tunel s jehož pomocí se budou 
 injectovat nové závisloti. 
 
 ```typescript jsx
function prepareIntervalOnSteroid(callback, time) {
    let cb = callback;
    let tm = time;
        function Component() {
            useInterval(cb, tm);
            return <div>Test</div>
        }
        b.init(() => <Component/>);
        b.syncUpdate();
    return {
        changeDependencies(callback, time) {
            cb = callback;
            tm = time;
            b.syncUpdate();
        }
    }
}
```
A použití pak bude vypadat následovně.
```typescript jsx
it("change callback", async () => {

    const cb = jasmine.createSpy("callback");
    const tunel = prepareIntervalOnSteroid(cb, 12);

    clock.tick(11);
    const cb1 = jasmine.createSpy("callback");
    tunel.changeDependencies(cb1, 12);
    await afterEffect();
    
    clock.tick(2);
    expect(cb).not.toHaveBeenCalled();
    expect(cb1).toHaveBeenCalled();
});
```
Hook je napsaný tak že registraci intervalu provádí v effect hooku. To znamená, že na provedení effect hooku musíme 
ještě počkat. Jenže test pořád neprochází. Odpověď na to proč, nalezneme v rozílu mezi prvním a druhým testovaným hookem. Zatímco 
první hook používal useState hook a změna stavové hodnoty zapříčiňovala volání invalidate. U druhého hooku nic takového 
nemáme. To znamená, že po změně dependencí využijeme volání rerender funkce. V podstatě tímto simulujeme to co se 
bude dít v aplikaci. V té se o změnu dependencí bude starat interakce komponenty s prostředím. Tu ale v rámci unitu 
zanedbáváme a simulujeme skrze právě vystavenou changeDependencies funkci a zavolání o rerender.

```typescript jsx
changeDependencies(callback, time) {
    cb = callback;
    tm = time;
    rerender();
}
```
Druhý test na změnu timeru bude vypadat následovně.
```typescript jsx
it("change timer", async () => {
    const cb = jasmine.createSpy("callback");
    const tunel = prepareIntervalOnSteroid(cb, 12);
    await afterEffect();
    clock.tick(11);
    tunel.changeDependencies(cb, 10);
    await afterEffect();
    clock.tick(2);
    expect(cb).not.toHaveBeenCalled();
    clock.tick(11);
    expect(cb).toHaveBeenCalled();
});
```

## Návrh generického toolingu
Teď když víme jak se věci mají a fungují nemělo by nic bránit tomu napsat generickou render funkci s možností měnit 
dependence.
```typescript jsx
interface IHookRender<T, P extends any[]> {
    bobrilNode: {current: b.IBobrilCacheNode};
    element: Element;
    currentValue: T
    changeDependencies(...dependencies: P): void;
}

function renderHook<T, P extends any[]>(hook: (...args: P) => T, ...dependencies: P): IHookRender<T, P> {
    let currentValue: T = {} as T;
    let deps = dependencies;
    let cacheNode: {current: b.IBobrilCacheNode} = {current: null};
    let domNode: HTMLDivElement;
    function Component() {
        cacheNode = b.useRef<b.IBobrilCacheNode>();
        Object.assign(currentValue, hook(...deps));
        b.useLayoutEffect(() => {
            domNode = b.getDomNode(cacheNode.current) as HTMLDivElement;
        }, []);
        return <div ref={cacheNode}>test</div>
    }

    b.init(() => {
        return <div><Component/></div>
    });
    b.syncUpdate();

    return {
        bobrilNode: cacheNode,
        element: domNode,
        currentValue,
        changeDependencies(...dependencies: P) {
            deps = dependencies;
            rerender();
        }
    }
}
```
Dle signatury funkce jako první parametr chodí hook který chceme testovat. Parametry hooku definujeme jako generický 
typ P a návratová hodnota je generické T. A refactoring testovaných hooku a přidaný další typ hooku, který pracuje s 
dom elementem pak vypadá následovně.
```typescript jsx
describe("useCounter", () => {
    it("testing hook", () => {
        const container = renderHook(useCounter);

        expect(container.currentValue.count).toBe(0);

        container.currentValue.increment();
        rerender();
        expect(container.currentValue.count).toBe(1);
    });

    it("with params", () => {
        const container = renderHook(useCounter, 6);

        expect(container.currentValue.count).toBe(6);
        container.currentValue.increment();
        rerender();
        expect(container.currentValue.count).toBe(7);
    });
    afterEach(() => clean());
});

describe("useInterval", () => {
    let clock: jasmine.Clock;
    beforeEach(() => {
        clock = jasmine.clock();
        clock.install();
    });
    it("call callback after timeout", async () => {
        const spy = jasmine.createSpy("testFunction");
        renderHook(useInterval, spy, 500);
        await afterEffect();
        clock.tick(501);
        expect(spy).toHaveBeenCalled();
    });

    it("call correct callback when changed", async () => {
        const spy = jasmine.createSpy("testFunction");
        const container = renderHook(useInterval, spy, 500);

        await afterEffect();
        const spyTwo = jasmine.createSpy("testFunction2");
        container.changeDependencies(spyTwo, 500);
        await afterEffect();

        clock.tick(501);
        expect(spy).not.toHaveBeenCalled();
        expect(spyTwo).toHaveBeenCalled();
    });

    it("change time", async () => {
        const spy = jasmine.createSpy("testFunction");
        const container = renderHook(useInterval, spy, 500);
        await afterEffect();
        clock.tick(499);
        expect(spy).not.toHaveBeenCalled();
        container.changeDependencies(spy, 300);
        await afterEffect();

        clock.tick(200);
        expect(spy).not.toHaveBeenCalled();

        clock.tick(101);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
        clock.uninstall();
        clean();
    });
});

describe("domMeter", () => {
    it("can measure dom", () => {
        const measureContainer = {
            bottom: 8,
            left: 4,
            right: 6,
            top: 2,
            width: 2,
            height: 6
        };
        const container = renderHook(useMeter, {current: null});
        spyOn(container.element, "getBoundingClientRect").and.returnValue(measureContainer);
        container.changeDependencies(container.bobrilNode);
        expect(container.currentValue.bottom).toBe(8);
        expect(container.currentValue.left).toBe(4);
        expect(container.currentValue.right).toBe(6);
        expect(container.currentValue.top).toBe(2);
        expect(container.currentValue.width).toBe(2);
        expect(container.currentValue.height).toBe(6);
    });

    afterEach(() => clean());
});
```
## A co kontext? (neboli cfg, ahoj Sváťo :) )
Když jsem říkal, že interakci s prostředím komponenty můžeme zanedbat, tak to nebyla úplně tak pravda. Protože 
existuje kontext. Což je hodnota braná právě z prostředí.
```typescript jsx
export const ThemeContext = b.createContext({
    color: "init color"
});

export function useThemeConsumer() {
    return b.useContext(ThemeContext);
}
```
Pro případ interakce s kontextem je nutné upravit renderHook funkci tak aby počítala i s tím, že testovací komponenta
 bude renderovaná v nějakém parentovi. Úprava na úrovni této funkce by ale zesložitila její použití. Takže cestou 
 rozšíření interfacu
 ```typescript jsx
export function renderHook<T, P extends any[]>(hook: (...args: P) => T, ...dependencies: P): IHookRender<T, P> {
    return renderHookInsideParent(hook, null, ...dependencies);
}

export function renderHookInsideParent<T, P extends any[]>(hook: (...args: P) => T, Parent: b.IComponentFactory<any> | null,  ...dependencies: P) {
    let currentValue: T = {} as T;
    let deps = dependencies;
    let cacheNode: {current: b.IBobrilCacheNode} = {current: null};
    let domNode: HTMLDivElement;
    function Component() {
        Object.assign(currentValue, hook(...deps));
        return <div ref={cacheNode}>test</div>
    }

    b.init(() => {
        return Parent ? <Parent><Component/></Parent> : <Component/>;
    });
    b.syncUpdate();
    domNode = b.getDomNode(cacheNode.current) as HTMLDivElement;

    return {
        currentValue,
        element: domNode,
        bobrilNode: cacheNode,
        changeDependencies(...dependencies: P) {
            deps = dependencies;
            rerender();
        }
    }
}
```
A samotné testy:
```typescript jsx
describe("with context", () => {
    it("use theme without provider", () => {
        const container = renderHook(useThemeConsumer);

        expect(container.currentValue.color).toBe("init color");
    });

    it("use theme with provider", () => {
        function Provider({children}: {children: b.IBobrilNode}) {
            b.useProvideContext(ThemeContext, {
                color: "blue"
            });
            return <>{children}</>;
        }

        const container = renderHookInsideParent(useThemeConsumer, Provider);
        expect(container.currentValue.color).toBe("blue");
    });
});
```
V podstatě v tomto případě testujeme jen to, že bobril funguje tak jak má. Nicméně je to přeci jen example :)
Řešili by jste něco jinak? Něco není jasné? Nějaký zajímavý hook, se kterým by si tento tooling neporadil? Neváhejte se 
ozvat. CYA guys

PS.: hack [repo](https://github.com/krewi1/bobril-hook-testing)
