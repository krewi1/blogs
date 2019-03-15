#Zdar

Vítejte na mém veřejném pískovišti. Tohle místo by me mělo sloužit jako místo na kterém si budu zkoušet
feature/chování bobrilu. Případně porovnávat s jinými frameworky. Ne že bych jich teda používal hodně. Hello world
projekt nepočítám jako adekvátní zkušenost pro porovnávání :). Takže pokud se uchýlím k nějakému porovnávání bude to
převážne s frameworkem reactjs.

Teď pro úplnost jen něco málo o bobrilu: framework jako takový je dílem Borise Letochy a byl vyvíjen pro potřeby 
firmy Quadient. Základním stavebním prvkem tohoto frameworku jsou komponenty, z kterých se následně staví celá aplikace 
Toť k povinnému úvodu a teď už s chutí do vyvíjení nějakých těch hodnot.

Bobril komponenta - jednotka komponentové struktury
Lze definovat v nejjednodušších případech pomocí javascriptového objektu:
```javascript 1.8
 const component = {tag: "div", children: "Hello world"}
```
Dále pak pomocí metody dostupné na prototypu bobrilu, konkrétně b.createComponent, potažmo b.createVirtualComponent. 
O rozdílech mezi těmito metodami možná někdy jindy.
```javascript 1.8
 const component = b.createComponent({
    render(ctx: b.IBobrilCtx, me: b.IBobrilNode) {
    	me.tag = "div";
    	me.children = "Hello world"
    }
 })
```
Obě možnosti udělají to samé. Tedy v momentě použití této komponenty se jejich DOM reprezentace definovaná v render 
funkci promítne do DOMu. Tedy v obou případech vytváříme div element kteý bude mít obsah "Hello world". O co se ya 
nás framework doopravdy stará ale není jen ryzí abstrakce nad DOM vrstou, ale i o fázi diffování současného stavu 
DOMU s tou která je vytvořena definovanými komponentami.

