#Zdar

Vítejte na mém veřejném pískovišti. Mám v plánu brát tenhle prostor jako hřiště, na kterém se chystám pitvat bobril . Případně budu porovnávat mé stávající znalosti z projektů v reactu s možnostmi v bobrilu.

V tomhle prvním výlevu nejřív uvedu bobril a pak bych se rád podíval na zoubek základním stavebním jednotkám bobrilí aplikace tedy struktuře označené v d.ts jako IBobrilNode dále psané prostě jako bobril node.
Teď tedy něco málo o bobrilu: framework jako takový je dílem Borise Letochy a byl vyvíjen pro potřeby 
firmy Quadient. Je to framework pracující s virtuálním domem, jehož základním stavebním jsou komponenty, z kterých se následně staví celá aplikace. Ještě před aplikací se tedy postaví virtuální DOM a blah blah blah. To už všichni známe.

Disclaimer: A ještě poslední věc před skutečným začátkem. To co zde budu prezentovat jsou osobní popisy/mentální modely. Budu se snažit co možná nejvěrněji opisovat realitu. Ale realita je složitá mrcha tak berte v podtaz určitý stupeň vágnosti . Dále pak v případě nalezení nesrovnalostí/jiného názoru jsem otevřen debatě.

###Toť k povině nepovinému úvodu a teď už s chutí do vyvíjení nějakých těch hodnot.
Bobril node - jednotka v bobril struktuře
bobril node není nic jiného než abstrakce nad konkrétním prvkem, který bude vykreslován v jeho nativním prosředí. V případě běhu na webu vytváříme za pomoci bobril nodů DOM elementy. Jak tedy tato abstrakce vypadá v podání bobrilu?:
```javascript 1.8
 const node = {tag: "div", children: "Hello world"};
```
Takto definovaná komponenta vytvoří div element a jeho obsah "Hello world". Tedy v imperativním světě volání přímo DOM api za nás tato deklarace dělá zhruba něco takovéhleho:
```javascript 1.8
    const div = document.createElement("div");
    div.textContent = "Hello world"
```
Co se stane když bobril nodu nespecifikujeme tag propertu.? Bobril vynechá vytvoření elementu a přidává pouze obsah, tedy v případě textového children obsahu vykreslí textContent. V případě bobril nodů jako children obsahu je jejich DOM reprezentace na rozdíl od bobril node stromové struktury nezanořená. Výhoda se nenachází ale pouze jen v odproštění od DOM implementace, ale i v tom co s bobril nodem bude pod pokličkou dělat Bobril. Konkrétně v případě datových změn uvnitř komponenty porovnávat stav nodu před a po změně a na základě porovnání, bobril změní příslušné property DOM elementu. Případně ho úplně nahradí/odebere. Této fázi říkáme "reconciliation" a o ní možná někdy příště.

Teď už ale k nečemu zábavnějšímu a to ke komponentám. Komponenta je specifický typ bobril nodu, který má naplněnou svou propertu component objektem s patřičným interfacem a z obyčejného bobril nodu se tímto stane chytřejší bobril node. Chytřejší znamená, že může plnohodnotně využívat prostředí ve kterém se nachází. Tedy odchytávat eventy, řešit po svém svém svůj životní cyklus, renderovat dynamická data, která přijdou z rodiče v komponentové struktuře a hlavně udržovat svůj vniřní stav a vyvolávat překreslení své a svých potomků. Chceme-li udělat z obyčejného nodu ten chytrý je postup poměrně přímočarý. Pro bobril node pouze dodefinujeme jeho komponentovou reprezentaci. Co se DOM interpretace týče je definice nody s komponentou ekvivalentní s nodou bez komponenty.
Tedy čistě z hlediska DOM equal platí:
```
     {tag: "div", children: "hello world"} === {component: {render: function (ctx) { ctx.me.children = "hello world"; ctx.me.tag = "div"}}}
```
V oblasti komponent se v bobrilu budeme často setkávat s pojmem kontext alias context alias ctx. Bylo by tedy dobré si nejdříve říct jak ho vlastně chápat a k čemu nám poslouží. Z lingvistického rozboru slova se dozvíme, že kontext je okolí jednotky, které je pro ni relevantní. Uhh dobře.. kontext v informatice: minimální množství informací, které proces musí uložit, než dojde ke změně kontextu. Hmmmm. Nicméně z těchto definic můžeme vyjít a říct, že kontext se bezprosředně týká nějaké sledované jednotky, v našem případě tedy komponenty, respektive bobril nodu. A dále si pojmě říci, že bobril node je dodefinováván na základě dat která jsou uchovávána právě v kontextu. Já přemýšlím o context jako mutable přepravce, která je dostupná v každém dílčím render cyklu.
Dost tlachání a hurá zpátky k psaní, konkrétně bobril node reprezentovaný komponentou.
```typescript
 const BobrilComponentNaive: b.IBobrilNode = {
    tag: "div",
    component: {
        render: function(ctx, me){
            me.children = `Hello world`; // aka ctx.me.children = "hello world
        }
    }
 };
```
Zajímvaý je přístup bobrilu k render funkci oproti reactu. React render funkce v class pojetí komponenty nepříjíma žádné parametry, protože vše k renderu potřebné najdeme na this objektu, kterým je současně renderovaný node. Zatímco u bobrilu je this v render funkci rovno komponentě kterou je node reprezentován. Další diametrální odlišností je návratová hodnota, která je v případě reactu ReactNode a v případě bobrilu void. Void? Jak tedy říci bobrilu aby něco zobrazil. Odpověď se nachází právě ve vstupních parametrech funkce. Neboť to jsou mutable datové struktury. A jak se vidět na ukázce nahoře k zobrazení na obrazovku dochází pomocí zapsání do children property bobril nodu. Pure object definition hint:
Pokud se rozhodnere upgradovat bobril node z jednoduchého na bobril node využívající komponentu, berte zřetel na ty mutable struktury viz.:
```javascript 1.8
 const node = {
	tag: "div",
	children: "My children life will be ended in the first rendering cycle",
	component: {
 	render: function(ctx, me){
 		// hey bobril, fuck that firstly defined children, lets render this one instead.
 		me.children = `Hello world`;
 	}
  }
};
```
Omylem se nám podařilo ještě před zobrazením něčeho na obrazovku přepsat původní children.

Takže jak už se nám podařilo zjistit, me je reference na bobril node. Prvním parametrem je context vysvětlovaný nahoře. Co je ke contextu potřeba dořící, tak to že nese data, v reactu známá jako props, tedy objekt kde najdeme data předávaná z rodičovské komponenty. Když se pustíme do hlubší pitvy context parametru zjistíme, že na contextu nalezneme také pod propertou component referenci na komponentu, tedy referenci na me (druhý parametr render funkce). Me jako druhý parametr je tedy pouze zkratka ze strany bobrilu. Do render funkce přichází ještě 3. parametr, který nemusí být definovaný (pro první render) a je jím konkrétní dom element spjatý s komponentou.
Toť ke statickým definicím. Ve chvíli, kdy komponentě chceme předat data zvenčí uděláme to tak, že data předáme bobril nodu přes property a ta jsou pak probublána až na context odkud si je v render funkci vyzvedneme. Tedy definice komponenty s daty vypadá takto:
```typescript
     const IBobrilStaticData: b.IBobrilNode = {
        tag: "div",
        component: {
            render: function(ctx, me){
                me.children = `Hello ${ctx.data.name}`;
            }
        },
        data: {
            name: "krewi"
        }
    };
```
Ryze objektem zapsaná komponenta je značně naivní řešení neboť se s ní obíráme o možnost dynamicky posílaných dat dovnitř komponenty. Pojďme tedy tuto definici "zdynamičtit". Dynamika = funkce.
```typescript
    interface IBobrilDynamic {
        name: string
    }
    
    export const BobrilComponentDynamic: (data: IBobrilDynamic) => b.IBobrilNode<IBobrilDynamic> = (data) => {
        return {
            tag: "div",
            component: {
                render: function(ctx, me){
                    me.children = `Hello ${ctx.data.name}`;
                }
            },
            data: data
        }
    };
```

V takto zapsané factory funkci jde dále snadno nalézt obecný pattern, kdy IBobrilDynamic typ pouze nahradíme generikou a objektovou definici znovu "zdynamyčtíme" a přijmeme jako parametr do obalovací funkce. Tedy:
```typescript
 export const BobrilComponentDynamicGeneric = <T>(component: b.IBobrilNode<T>) => (data: T) => {
     return {
         ...component,
         data: data
     }
 };
```
 Zde přichází na pomoc bobril se svými helper funkcemi: createComponent a createVirtualComponent. Ve skutečnosti dělají ještě režiji okolo a místo celé definice nodu přijímají pouze definici komponenty protože to je ve skutečnosti to zajímavé, ale principielně fungují obdobně jako naše factory. Na konkrétním případě pak využití helper funkcí vypadá takto:
```typescript
    interface IContext extends b.IBobrilCtx {
        increment(): void;
        decrement(): void;
        count: number;
        timeoutId: number;
    }
    
    export const Counter = b.createComponent<IContext>({
        init(ctx: IContext){
            ctx.increment = () => {
                ctx.count++;
                b.invalidate(ctx);
            };
            ctx.decrement = () => {
                ctx.count--;
                b.invalidate(ctx);
            };
            ctx.count = 0;
            ctx.timeoutId = setInterval(() => {
               ctx.increment();
            }, 1000)
        },
        destroy(ctx: IContext): void {
            clearInterval(ctx.timeoutId)
        },
        render(ctx: IContext, me: b.IBobrilNode): void {
            me.children = [
                {tag: "h1", children: "counter"},
                {tag: "div", children: ctx.count},
                Button({title: "+", callback: () => ctx.increment()}),
                Button({title: "-", callback: () => ctx.decrement()}),
            ];
        }
    });
    
    interface IBtnData {
        title: string;
        callback(): void;
    }
    
    interface IButtonCtx extends b.IBobrilCtx {
        data: IBtnData;
    }
    
    const Button = b.createComponent<IBtnData>({
        onClick(ctx: IButtonCtx){
            ctx.data.callback();
            return true;
        },
        render(ctx: IButtonCtx, me: b.IBobrilNode) {
            me.tag = "button";
            me.children = ctx.data.title;
        }
    });
```
Helper funkce se nám postará o vytvoření factory funkce k definovanému objektu posílanému skrze parametr. A generika na funkci nám zaručí typesefty volání faktory funkce.

###Nejnovější bobril a nové API
Pamatuje zmínku o kompletně rozdílném pohdledu bobrilu na render komponent a zobrazování na základě mutování objektu.? Bobril ve verzi 9.0 přichází s Api podobnějším Reactu a kompletně novou možností definování komponent přes classy:
```typescript
    class CounterClass extends b.Component<never> {
        count: number = 0;
        timeoutId: number;
        postInitDom(): void {
            this.timeoutId = setInterval(() => {
                this.increment();
            }, 1000)
        }
        destroy(): void {
            clearInterval(this.timeoutId)
        }
    
        increment(){
            this.count++;
            b.invalidate(this);
        }
    
        decrement() {
            this.count--;
            b.invalidate(this);
        }
    
        render(data: {}): b.IBobrilChildren {
            return [
                {tag: "h1", children: "Counter"},
                {tag: "div", children: this.count},
                Button({title: "+", callback: () => this.increment()}),
                Button({title: "-", callback: () => this.decrement()}),
            ]
        }
    }

    const CounterComponent = b.component(CounterClass);
```
Tento způsob dovedl komponenty ještě o krok dál, protože nevyžaduje aby uživatel manipuloval s bobril nodem. Namísto toho nás nechává pouze definovat jak bude vypadat výstup komponenty. Dále redefinuje context (svým způsobem). Jak je vidět z render funkce a lifecycle metod context úplně zmizel. Kam se poděl? Správná otázka zní na co jsme ho vůbec v jeho plné kráse potřebovali. Jako přepravku dat mezi render cycly? Na to přeci teď už můžeme využít classu a její property. Jako objekt z kterého jsme dostávali data.? Data nyní chodí jako vstupní parametr do render funkce a dále je máme k dostání na this. UH? Ano, blížíme se k cíli, kontextem je nyní sama class componenta.
I přes to, že je render funkce naprosto jednoduchá musíme do ní chvíli koukat a hlavně přemýslet o tom jak bobril nakládá s bobril nody. Pojďme nahradit bobril nody funkcemi.:
```typescript
    render(data: {}): b.IBobrilChildren {
         return [
           h1({content: "Counter"}),
           div({content: this.count}),
           Button({title: "+", callback: () => this.increment()}),
           Button({title: "+", callback: () => this.decrement()})
       ]
    }
```
Abstrahovali jsme vytváření bobril nodů za funkční volání a jejich pojmenováním zaručili intuici o tom co se zhuba promítne do DOMu. Můžeme to z hlediska přehlednosti posunout ještě dál? Odpověď zní možná. :D Pokud použijeme technologii JSX se kterou je bobril plně kompatibilní, můžeme render funkci deklarovat následovně:
```typescript
    render(data: {}): b.IBobrilChildren {
         return (
             <>
                <h1>Counter</h1>
                <div>{this.count}</div>
                <button onClick={() => this.increment()}/>
                <button onClick={() => this.decrement()}/>
             </>
         )
    }
```
V Takto zapsaném renderu jsme jednak zachovali intuici o tom co bude v DOMu za elementy a navíc jsme zápis dost přiblížili tomu co v DOMu opravdu bude syntakticky. Na druhou stranu ta abstrakce funkcí, schovávajících se za jsx může být matoucí a vyvolávat WTF reakce pro neznalce JSX? Názor si musí každý udělat sám. 

Tímto jsme se dostali na konec. Těm kdo se prokousali až sem gratuluji, že jsem je neunudil a jen co mě to škola dovolí tak se ozvu znovu. Tě píc.



