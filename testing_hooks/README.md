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
pro přidání root nodu a syncUpdate pro vynucení renderu.
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
je tedy nutné po řící aby změny promítl hned skrze volání syncUpdate.

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
Uderne duo invalidate a syncUpdate se nam v budoucnu bude jeste hodit. Tak tato volani schovame za funkci pojmenovanou rerender. 
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
```
Jelikož je prepare funkce definovaná mimo scope obou testů, musíme najít jinou cestu, jak do testu dostat hodnotu pro expectovani. Tou je navrácení referenční 
hodnoty, která je updatovaná v každém renderu.
```typescript jsx
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
Pokud má hook pouze takto závislost na stav. Řešení je přímočaré. Ale co když potřebujeme provádět side effekty nebo 
operace s DOMem?
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
První test, který nás napadne je zkontrolovat, že useInterval po specifikovaném intervalu opravdu zavolá poskytnutý 
callback. Nejdříve definujme prepare funkci
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
 Další z věcí co zbývá dořešit je posun na časové ose. Jasmine poskytuje pro tyto případy helper objekt dosupný pod 
 jasmine.clock().
 ```typescript jsx
describe("useInterval prepare", () => {
    it("prepare init", () => {
        let clock: jasmine.Clock;
        clock = jasmine.clock();
        clock.install();
        const cb = jasmine.createSpy("callback");
        prepareInterval(cb, 12);
        
        // after ms
        clock.tick(13)ů
        expect(cb).toHaveBeenCalled();
        clock.uninstall();
    });
});
```

Nejříve zavedeme pomocný objekt pomocí volání install a na konci testu ho zase uklidíme. Posun pak probíha voláním 
tick. Install a uninstall typicky přijdou do beforeEach a afterEach funkce. Vyřešil se jeden problém a vyskočil 
na nás další. UseEffect funkce totiž není synchronní nicméně je vykonávána jakmile to bude možné. V bobrilu na 
toto existuje pomocná funkce asap. Budeme tedy potřebovat tool který dokáže říct zda se již zavolal effekt uvnitř 
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
S tím jak je hook napsaný je potřeba před expecty ještě počkat na to, až budou dokončené naschedulované effect funkce
. Jenže test pořád neprochází. Odpověď na to proč nalezneme v rozílu mezi prvním a druhým testovaným hookem. Zatímco 
první hook používal useState hook a měnění stavové hodnoty zapříčiňovalo invalidate. U druhého hooku nic takového 
nemáme. Kromě syncUpdatu tady budeme potřebovat volat ještě invalidate. Zavedem proto pomocnou funkci.

A tu provoláme namísto pouze volání o syncUpdate z changeDependencies funkce. 
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
Řešili by jste něco jinak? Něco není jasné? Neváhejte se ozvat.

PS.: hack [repo](https://github.com/krewi1/bobril-examples)
