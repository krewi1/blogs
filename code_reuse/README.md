# Přístupy ke znovupoužitelnosti komponent
Holahou přátelé. Holahou přátelé, holahou přátelé. Jak lépe začít dokument o zbavování se repetitivnosti než právě 
repetitivností. :)

## DRY koncept
DRY je acronym pro 3 anglická slovíčka DONT REPEAT YOURSELF, tedy NEOPAKUJ SE. Což se lehce řekne, nicméně najít 
vhodnou abstrakci je kokikrát složité. A proto zde máme návrhové vzory, které problém s vymýšlením abstrakce řeší za nás a my
 na ně jen našroubujem problém. Konkrétně bych chtěl vypíchnout 3 možnosti jak pomocí kompozice sdílet kód.
 
 ## DISCLAIMER
 Celý tento článek je založen na API bobrilu 9.6+. Neb v něm přichází bobril s podporou hooků, za pomoci kterých už 
 jsme schopni napsat většinu logiky. 
 
## Render props
Implementace takovéhoto návrhového vzoru je jednoduchá, vytvoříme komponentu, která jako svá vstupní data nebude brát
 bobril nody, ale render funkce bobril nodů, kterým bude do parametru injectovat své privátní hodnoty. Na konrétnímm 
 případě: Potřebujeme detekovat pozici kurzoru uvnitř elementu. Naivní implementace je poměrně přímočará.
 
```typescript
class NaiveCursorDetect extends b.Component<{}> {
    position: Position;

    constructor() {
        super();
        this.position = {
            x: 0,
            y: 0
        }
    }

    onMouseMove(event: b.IBobrilMouseEvent): b.GenericEventResult {
        const {x, y} = event;
        this.position = {
            x,
            y
        };
        b.invalidate(this);
        return b.EventResult.HandledPreventDefault;
    }

    render(data: {}): b.IBobrilChildren {
        return (
            <div style={{width: "500px", height: "500px", position: "relative"}}>
                {this.position.x}
                {this.position.y}
            </div>
        )
    }
}
```
Tím máme vytvořenou komponentu která je schopna renderovat pozici cursoru uvnitř svého divu. Perfektní a validní 
řešení. Nyní uvažme scénář kdy uvnitř této komponenty chceme renderovat další komponenty, které na svém interfacu 
přijímají pozici na které se uvnitř svého parenta nacházejí. Easy peasy. Definujeme tedy nejdříve komponentu, která 
se dokáže pozicovat v rámci parenta.
````typescript
    export function ComponentOnPosition(data: Position, children: b.IBobrilChildren) {
        return (
            b.styledDiv(children, {
                position: "absolute",
                top: data.y,
                left: data.x
            })
        )
    }
````
Jednoduchá komponenta přijímající pozici jako svůj parametr. A teď upravíme render funkci obalovací komponenty
```typescript
    render(data: {}): b.IBobrilChildren {
            return (
               <div style={{width: "500px", height: "500px"}}>
                   <ComponentOnPosition x={this.position.x} y={this.position.y} >
                       Victim
                   </ComponentOnPosition>
                   <ComponentOnPosition x={this.position.x - 10} y={this.position.y - 10} >
                       Stalker
                   </ComponentOnPosition>
               </div>
            )
        }
```
A je to. Renderujeme oběť a stalkera na základě pozice cursoru. Naše skvělá komponenta běží týden a přijde za námi 
nadříyený s tím, že nemáme strašit malé děti a udělat stejnou verzi, která nebude mít PEGI12. Oukej šéfe není problem, 
dovoluji si vám představit moje kamarády Controla C Controla V :). A teď vážně, chceme tedy upravit render funkci tak 
aby zobrazovala Toma a Jerryho, na místo stalkera a oběti. Pokud ale upravíme původní render rozbijeme komponentu s 
PEGI12. 

## Render props jako záchrana 
Čeho tedy chceme dosáhnout? Mít dynamický obsah uvnitř renderovaného divu. A jak už víme dynamika = funkce. Upravme 
tedy komponentu tak aby přijímala funkci, která bude na její zavolání vracet komponentu/komponenty a jako parametr 
bude přijímat to co je v této komponentě to hlavní, tedy pozici.
```typescript
export interface IData {
    render: (position: Position) => b.IBobrilChildren;
}

class DynamicCursorDetect extends b.Component<IData> {
    position: Position;

    constructor() {
        super();
        this.position = {
            x: 0,
            y: 0
        }
    }

    onMouseMove(event: b.IBobrilMouseEvent): b.GenericEventResult {
        const {x, y} = event;
        this.position = {
            x,
            y
        };
        b.invalidate(this);
        return b.EventResult.HandledPreventDefault;
    }

    render(data): b.IBobrilChildren {
        return (
            <div style={{width: "500px", height: "500px"}}>
                {data.render(this.position)}
            </div>
        )
    }
}
```
Použití této komponenty pak vypadá následovně
```typescript
<DynamicCursorDetectComponent render={position => (
    <>
        <ComponentOnPosition x={position.x} y={position.y}>
            Tom
        </ComponentOnPosition>
        <ComponentOnPosition x={position.x - 10} y={position.y - 10}>
            Jerry
        </ComponentOnPosition>
    </>
)}/>
```

## HOC alias High Order Component
Tento komponentový návrhový vzor je už lehce složitější na uchopení. Je založený na myšlence obalení komponenty jinou
 komponentou. 
 ```typescript
export function hocDetectCursor<T extends Position>(Component: b.IComponentFactory<T>): b.IComponentFactory<{}> {
    return b.component(class HocDetectInParent extends b.Component<{}> {
        render() {
            return <Component/>
        }
    }
}
```
Jak je vidět z příkladu vystavujeme funkci, která přijímá původní komponentu jako parametr a vrací komponentu která v
 renderu vykresluje původní komponentu. Obalovací komponenty jsou dále děleny na 2 typy a to injectory a enhancery, tedy komponenty které dovnitř vnitřní 
 komponenty poskytují nějaká data navíc a komponenty rozšiřucící funcionalitu vnitřní komponenty. Pojďme se vrátit k 
 našemu prvnímu problému vykreslování komponenty na pozici cursoru. Chceme tedy vykreslovat komponentu na základě pozice cursoru uvnitř parent 
 componenty. Napíšeme tedy komponentu která bude schopna toto řešit.
 
```typescript
export function hocDetectCursor<T extends Position>(TempComponent: b.IComponentFactory<T>): b.IComponentFactory<{}> {
    return b.component(class HocDetectInParent extends b.Component<{}> {
        position: Position;
        offset: OffsetInfo;

        constructor() {
            super();
            this.position = {
                x: 0,
                y: 0
            };
            this.offset = {
                x: 0,
                y: 0,
                maxX: 0,
                maxY: 0
            };
        }

        postInitDom(me: b.IBobrilCacheNode): void {
            const element = b.getDomNode(me) as HTMLElement;
            const bounding = element.getBoundingClientRect();
            this.offset = {
                x: bounding.left,
                y: bounding.top,
                maxX: bounding.width,
                maxY: bounding.height,
            };
            this.recalculatePosition(this.position.x, this.position.y);
        }

        onMouseMove(event: b.IBobrilMouseEvent): b.GenericEventResult {
            const {x, y} = event;
            this.recalculatePosition(x, y);
            return b.EventResult.HandledPreventDefault;
        }

        private recalculatePosition(x: number, y: number) {
            const {maxY, maxX, x: offsetX, y: offsetY} = this.offset;

            this.position = {
                x: normalizeCoords(maxX, x - offsetX),
                y : normalizeCoords(maxY, y - offsetY)
            };
            b.invalidate(this);
        }

        render(data) {
            const Component = TempComponent as any;
            const {x, y} = this.position;
            return (
                <div style={{width: "100%", height: "100%"}}>
                    <Component x={x} y={y}>
                        {data.children}
                    </Component>
                </div>
            )
        }
    })
}
```
Napsali jsme injectorHoc který spočítá pozici componenty v parentu a následně ji injectuje dovniř obalované komponenty.

Druhý typ hoc component řeší lehce odlišné problémy. Konrétně doplnění/pozměnění funkcionality vnitřní komponenty, 
případně se může starat o transformaci dat z vstupních do HOC na výstupní do vnitřní komponenty.

```typescript
export function hocEnhancer<T>(TempComponent: b.IComponentFactory<T>): b.IComponentFactory<ComponentData<T>> {
    return b.component(class HocDetectInParent extends b.Component<ComponentData<T>> {
        loading: boolean;
        loadedData: T | null;

        constructor() {
            super();
            this.loading = true;
            this.loadedData = null;
        }

        init() {
            this.data.data.then((data) => this.dataLoaded(data))
        }

        dataLoaded(incomeData: T) {
            this.loading = false;
            this.loadedData = incomeData;
            b.invalidate(this);
        }
        render() {
            const Component = TempComponent as any;
            if (this.loading) {
                return <div>Loading...</div>
            }
            return (
                <Component {...this.loadedData}/>
            )
        }
    })
}
```
Na příkladu je právě jedna taková komponenta, která na vstupu bere Promise, jejímž resolvnutím dostaneme data 
generického typu, která očekává komponenta kterou obalujeme. HOC componenta drží ve svém stavu informaci o tom zda 
již byla promisa resolvnutá a vpřípadě že ano, renderuje komponentu které posíla unwrapnutá data získaná z promisy. V
 případě, že na data stále čekáme, zobrazuje ne zrovna sofistikovaný loader. Vstupná data do HOC jsme tedy 
 transformovali na data s kterýma již vnitřní komponenta umí pracovat. Ta se následně může starat jen o to k čemu je 
 stvořena, tedy renderovat view na základě dat a neřešit asynchronnost.
 
 ## Hooks
 
 ##DISLCLAIMER
 Ještě je v bobrilu nemáme úplně dostupné, kromě hooku useState. Takže to budu představovat s využitím reactu.
 
Zatím jsme si představili 2 návrhové vzory, které se svým přístupem liší a člověk musí často přemýšlet nad tím, který
 bude lepší použít. Co kdyby jsme měli jen jeden přístup, který pokryje všechny casy plnohodnotně? To zní dobře, ale 
 jak na to? Odpověď je HOOK. Pojďme si představit ty základní. 
 
 ## useState
 Chceme mít stav uvnitř funkionální komponenty? Není problém.
```javascript 1.8
export const UseStateHook = () => {
  const [xPosition, setXPosition] = useState(0);
  const [yPosition, setYPosition] = useState(0);

  return (
    <div
      style={{ width: "300px", height: "300px", position: "relative" }}
      onMouseMove={event => {
        setXPosition(event.clientX);
        setYPosition(event.clientY);
      }}
    >
      <div style={{ position: "absolute", top: yPosition, left: xPosition }}>
        Rendered item
      </div>
    </div>
  );
}
```
[codesanbox](https://codesandbox.io/s/54ol8kvo3l) V podstatě asi není nic moc co vysvětlovat. React vyvoří v paměti 
místo do kterého ukládá informace které se vážou k render funkci této komponenty, v každém jejím dalším renderu jsou 
informace vzaté z tohoto stejného místa. Clean and easy.

## useEffect
Vycházejme z překladu, tedy použij effect(side effect). Hook je volán mimo hlavní render funkci. Není o něm tedy 
možné přemýšlet synchronně. Slouží pro provádění side effektů týkajících se komponenty (volání API, 
bindění na browser eventy, subscribce).

```typescript
export const UseEffect: React.FunctionComponent = () => {
  const [pressedKey, setPressedKey] = React.useState("");
  React.useEffect(() => {
    console.log("binding will happen");
    const handler = (event: KeyboardEvent) => setPressedKey(event.key);
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  });

  return (
    <div>
      <div>Focus browser and start typing</div>
      {pressedKey}
    </div>
  )
};
```
[codesanbox](https://codesandbox.io/s/k96krw9p45) Funkční řešení výpisu zmáčknuté klávesy. Jelikož bindíme na window je dobrá zvyklost si po sobě také uklidit. K tomu slouží 
návratová hodnota funkce deklarované uvnitř useEffectu. Jak jsme již zkonstatovali, řešení je to funkční. Nicméně 
pokud otevřeme konzoli zjistíme, že se nám s každým voláním render funkce komponenty pokaždé provádí deklarovaný 
efekt. Pokud efekt není nutné vykonávat s každým rendrem, můžeme useEffectu druhým parametrem říci jeho závislosti, 
na které ma brát zřetel při rozhodování zda bude efekt funkci vykonávat znovu. Pro náš případ je tedy seznam 
dependencí prázdný. Což znamená. Proveď jen a pouze při prvním renderu, pak už tě nemusí zajímat nic.

```typescript
export const UseEffect: React.FunctionComponent = () => {
  const [pressedKey, setPressedKey] = React.useState("");
  React.useEffect(() => {
    console.log("binding will happen");
    const handler = (event: KeyboardEvent) => setPressedKey(event.key);
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  }, []);

  return (
    <div>
      <div>Focus browser and start typing</div>
      {pressedKey}
    </div>
  );
};
```
[codesanbox](https://codesandbox.io/s/xr0xo3rm9o) Pokud se nyní koukneme do konzole tak ta je krásně čistá, teda až 
na ten bordel, za který může codeSandbox.

Teď ale něco zajímavějšího. Pojďme definovat další mód pro náš handler na window, ve kterém začneme místo zmáčklé 
klávesy vypisovat její kód. Módu budeme měnit za pomoci mezerníku. 
```typescript
export const UseEffectNotWorking: React.FunctionComponent = () => {
  const [pressedKey, setPressedKey] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setCodeMode(!codeMode);
      } else {
        setPressedKey(codeMode ? event.code : event.key);
      }
    };
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  }, []);

  return (
    <div>
      {pressedKey}
    </div>
  )
};
```
[codesanbox](https://codesandbox.io/s/xz96nopjnw)
Poučeni z minulých nezdarů rovnou přidáváme binding jen a pouze v případě prvního renderu. Ono to ale nefunguje. 
Odpověď na otázku proč to nefunguje najdeme v javascriptu samotném a konrétně za to mohou closury. Deklarace efekt 
funkce probíhá v čase prvního renderu, kdy máme buňce pojmenované codeMode uloženou hodnotu false. Hodnota false je 
tedy dostupná z closury v každém dalším volání efektové funkce. Tedy ternární výraz uvnitř setPressedKey je pokaždé 
vyhodnocen negativně. Zalhali jsme totiž useEffectu ohledně jeho závislostí. Je totiž závislý právě na hodnotě 
codeMode. Přepíšeme tedy seznam závislostí.

```typescript
export const UseEffectNotWorking: React.FunctionComponent = () => {
  const [pressedKey, setPressedKey] = React.useState("");
  const [codeMode, setCodeMode] = React.useState(false);
  React.useEffect(
    () => {
      const handler = (event: KeyboardEvent) => {
        console.log("binding will happen");
        if (event.key === " ") {
          setCodeMode(!codeMode);
        } else {
          setPressedKey(codeMode ? event.code : event.key);
        }
      };
      window.addEventListener("keypress", handler);
      return () => window.removeEventListener("keypress", handler);
    },
    [codeMode]
  );

  return (
    <div>
      <div>Focus browser and start typing</div>
      {pressedKey}
    </div>
  );
};
```
[codesanbox](https://codesandbox.io/s/ojp3k0z95q) Vualá a vše funguje jak má. Když zkusíme zmáčknout mezerník 
zjistíme, že funkce uvnitř effektu proběhla znovu, tedy došlo k přebindování funkce a tato nová funkce má už novou 
hodnotu ve své closure.

Tak a teď to hlavní okolo hooku proč je kolem nich takové haló. React nám umožňuje kromě standartních hooku 
, nevyjmenoval jsem zde všechny, pro kompletní seznam se podívejte do jejich dokumentace: [doc](https://reactjs.org/docs/hooks-reference.html),
definovat i vlastní. Pojďme tedy napsat logiku pro počítání komponenty na souřadnicích za pomoci hooků. Dle konvence 
use + co chceme dělat ho pojmenujeme useCursorCoordinates.
```typescript
function useCursorCoordinates(ref) {
  const [positionX, setPositionX] = React.useState(0);
  const [positionY, setPositionY] = React.useState(0);

  React.useEffect(
    () => {
      const handler = (event: MouseEvent) => {
        setPositionX(event.clientX);
        setPositionY(event.clientY);
      }
      if (ref.current) {
        ref.current.addEventListener("mousemove", handler);
        return () => ref.current.removeEventListener("mousemove", handler);
      }
      return null;
    },
    [ref.current]
  );

  return [positionX, positionY];
}
```
 [codesandbox](https://codesandbox.io/s/r81162n6m). Jako vstupní parametr do našho hooku jde ref, což je mutable 
 reference, uvnitř které nalezneme DOM element v nemž chceme detekovat pozici kurzoru. Na této referenci nám záleží 
 uvnitř efekt funce, uvádíme ji tedy jako její závislost. V neposlední řadě po sobě nezapomeneme uklidit. Tím máme 
 hook definovaný a můžeme ho používat skrz aplikaci.
 ```typescript
function App() {
  const ref = React.useRef();
  const [x, y] = useCursorCoordinates(ref);
  return (
    <div
      ref={ref}
      style={{
        border: "1px solid black",
        width: "300px",
        height: "300px",
        position: "relative"
      }}
    >
      <div style={{ position: "absolute", top: y, left: x }}>Text</div>
    </div>
  );
}
```
Zajímavý je zde další použitý hook useRef, který nám poslouží jako zmiňovaná přepravka, do které si uložíme referenci
 na DOM element. Use ref tedy vytváří objekt, který nám poslouží pro předávání dat z jednoho renderu do dalšího.
 
 ## A máme tu bobril a verzi 9.6. HOOK IT UP
 Než jsem tohle psaní stihl vydat přišel bobril s novou verzí ve které slibuje funkšční hooky useEffect a 
 useLayoutEffect. Takže teď již nic nebrání tomu zkusit napsat tu samou logiku jako v reactu i v bobrilu.
 
 ```typescript
export const UseState = b.component(class UseStateClazz extends b.Component<{}> {
    element?: HTMLElement;
    postInitDom(me: b.IBobrilCacheNode): void {
        this.element = b.getDomNode(me) as HTMLElement
    }

    render() {
        const [offsetTop, offsetLeft] = useElementOffset(this.element);
        const [xPosition, setXPosition] = b.useState(0);
        const [yPosition, setYPosition] = b.useState(0);
        return (
            <div style={{width: "300px", height: "300px", position: "relative"}} onMouseMove={(event: any) => {
                setXPosition(event.x - offsetLeft);
                setYPosition(event.y - offsetTop);
            }}>
                <div style={{position: "absolute", top: yPosition, left: xPosition}}>Rendered item</div>
            </div>
        )
    }
});
```
Bobril narozdíl od reactu umožňuje využití hooků v class komponentách. Což je zajímavé a class pojetí nám umožní 
úplně vynechat useRef hook, který budeme moci suplovat právě classou. To je možné vidět právě na tomto příkladu, kde 
si do class property element ukládáme aktualní referenci na element. Ten dostáváme v lifecycle metodě postInitDom.
Vlastí definici hooku se budu věnovat v zápětí, takže useElementOffset přeskočím.

Tak a teď example s detekcí zmáčklého tlačítka. Přeskočím nefunčni řešení. Vycházejme z toho že bobril funguje stejně
 jako react. Definujme tedy vlastní hook, který bude umět detekovat zmáčklé tlačítko na window.
 ```typescript
function useKeyPressed() {
    const [pressedKey, setPressedKey] = b.useState("");
    const [codeMode, setCodeMode] = b.useState(false);

    b.useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === " ") {
                setCodeMode(!codeMode);
            } else {
                setPressedKey(codeMode ? event.code : event.key);
            }
        };
        window.addEventListener("keypress", handler);
        return () => window.removeEventListener("keypress", handler);
    }, [codeMode]);

    return pressedKey;
}
```

A nyní komponenta využívající tento hook
```typescript
export const UseEffect = b.component(() => {
    const pressedKey = useKeyPressed();

    return (
        <div>
            {pressedKey}
        </div>
    )
});
```
Jednoduchý zápis, jednoduchá znovupoužitelnost na základě zavolání funkce. 
 
 ## Závěr
 S možnostmi jež nám poskytuje bobril je ale nutné zacházet opatrně a jasně definovat oblastni ve kterých chceme 
 používat který přístup. Dovedu si dost dobře představit, že neopatrným mixováním hooků s class pojetím definice 
 komponenty zaneseme do kódu nadbytečnou logiku, která v konečném důsledku bude těžko uchopitelná a bude bránit 
 čitelnosti kódu.
 
 A tím jsme se dostali až na konec. Čtenářům děkuji a tě píc.