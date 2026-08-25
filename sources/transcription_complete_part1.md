# Transcription Intégrale - "Architecte IA 2027 : Naviguer dans le Chaos, Réinventer le Futur"

**Source** : Vidéo YouTube (février 2026)
**Durée** : ~3h
**Note** : Transcription **verbatim** (mot à mot) découpée en chapitres pour la lisibilité. Aucun contenu omis ou reformulé.

---

## 0:00 - Introduction

Moins de 10000 humains sur 8 milliards comprennent ce qu'il se passe quand tu tapes un prompte. Les experts qui te
vendent des packs de prompt à 9 € ne peut même pas expliquer pourquoi le promp te donne deux résultats différents. Dans cette vidéo, je vais te
montrer ce que personne [musique] n'a jamais montré. Ni en français, ni en anglais, ni en chinois, nulle part. La
mécanique interne, les probabilités, le chaos et tout simplement pourquoi au bout de tout ça, on ne contrôle
absolument [musique] rien. Si tu comprends 50 % de ce qui va suivre, tu es déjà dans le top. 0,1 % du
marché. Et si tu restes jusqu'à la fin, tu comprendras pourquoi même les créateurs de ces modèles ne savent même
pas ce qu'ils ont construit. Donc avant de commencer, je préfère te

## 0:42 - Le mensonge collectif

prévenir, je vais aller à l'encontre de ce que tu as pu entendre sur le marché et de ce que tu crois potentiellement.
Donc la règle numéro 1, c'est que je ne vais pas vulgariser vers le bas, je vais vulgariser vers le haut. Donc tu vas monter. La règle numéro 2, c'est que
chaque mot a été pesé. Il y a rien qui est là par hasard. Et la règle numéro 3, c'est tout simplement si tu arrives à
comprendre 50 % de ce qui suit, tu es déjà dans le top 0,1 % du marché. Donc tu vas vraiment te rendre compte de la
profondeur de cette vidéo. Déjà quand tu vas voir la longueur qu'elle va faire et le nombre de factualités qu'elle contient, c'est tout simplement la vidéo
la plus travaillée et la plus profonde que j'ai faite sur cette chaîne en déjà plus de 3 ans. Commençons dans un

## 1:18 - La boîte noire des LLM

premier temps en parlant de la boîte noire des LLM. Donc personne, je dis bien personne, ni Samcman, ni Dario
Amode, ni Elon Musk, aucun humain sur cette terre ne peut tracer le chemin exact d'un token d'entrée à un token de
sortie. Donc du prompte que tu vas mettre dans une IA jusqu'au résultat final. Il y a Sokever l'a même dit, ce
qui se passe à l'intérieur du réseau de neuron n'est peut-être rien de ce que nous pensons. Nous ne voyons que les ombres sur le mur. Donc c'est lui. Tu as
certainement déjà dû le voir quelque part. Donc là, tu te dis peut-être "Mais pourquoi c'est une boîte noire ? Quel est ce terme ?" et cetera. Tout
simplement en premier lieu l'échelle incompréhensible Dipsic V3.2 qui contient 671 milliards de paramètres. Et
bien personne ne peut expliquer pourquoi un paramètre vaut 0,00347
plutôt que 0,00346. En deuxème, on a l'émergence. Donc GPT 5.2 va résoudre des problèmes
mathématiques que GPT3 ne pouvait pas. Personne n'a ajouté de module. Le comportement a tout simplement émergé en
l'espace d'à peu près 3 ans lorsque cette vidéo est tournée. Et en troisème, nous avons l'absence de causalité. Donc
ça peut être un peu profond, je le conçois. Mais en bref, on a un input avec des milliards de multiplications matricielles qui donne un output. Cet
output est non traçable. Il y a pas de logique humaine à l'intérieur. Pour beaucoup d'entre vous, ça peut être flou concernant l'échelle de grandeur des

## 2:30 - L'Échelle des paramètres

paramètres parce qu'on dit on a 100 milliards de paramètres, 400 milliards, 600. Bon, ça c'est vrai que c'est bien mais en théorie commençons par un
élément que tout le monde connaît, nature. Donc les neurones d'une abeille. Une abeille contient 1 million de neurones, donc 10^6, ce qui lui permet
déjà de danser, communiquer, naviguer et mémoriser. Ensuite, on passe à la population de Paris, 2,1 million. Je
t'inviterai à faire pause à chaque fois parce que si je lis tout, on va on va vraiment en avoir pour 6h pour la vidéo. Ça me dérangerait pas de faire une vidéo de 6h mais c'est surtout pour toi que je
essaie de la condenser. 760 millions, c'est les neurones d'un chat. 1,5 milliards, c'est GPT 5.2. Battement
d'un cœur dans une seule vie, c'est à peu près 2,5 milliards. Mistral 7B 7 milliards de paramètres. Yamaha 3 8
milliards. Donc si on fait une comparaison, il y a autant de paramètres dans Yamaha 3.1 8B, donc 8 milliards de
paramètres que d'humain sur terre actuellement. Dipsicarin 37 milliards, donc de paramètres actifs. Ensuite des
modèles Quen 2.5, Mistral large 2, GPT3 175 milliards. Donc si on fait une
comparaison rapide, GPT3 a presque autant de paramètres qu'il a d'étoiles dans notre galaxie. Bon, on parle de GPT3. Dipsic V3 donc en mixture of
expert lui contient 671 milliards de paramètres. 10^12 donc ça commence à être énorme. Ensuite GPT4 qui a été
estimé. Donc là on passe plus en milliard, on passe en trillion. Donc 1,8 trillions. Si on fait une comparaison
sur terre, on a à peu près 3 trillions d'arbres. Donc il y a plus d'arbres sur terre que de paramètres dans GPT4. C'est
intéressant de le savoir. GPT5 Orion estimé, je dis bien estimé, on est à 5 trillions. Clode 4. Opus, pareil 5
trillions en estimé. Donc pour faire une comparaison, nous avons à peu près 100 trillions de synaps dans notre cerveau
et Clodus 4. Donc le cerveau humain a 20 fois plus de synaps que le plus gros des LLM
actuellement. Quand je dis le plus gros, c'est relatif. Nous avons 37 trillions de cellules dans notre corps humain comme je l'avais précisé, 100 trillions
de synaps dans notre cerveau. Il y a 20 quadrillions de fourmis sur terre, donc 10^16, c'est énorme. Il y a 7,5
quintillions de grains de sable sur terre, donc 10^19. Il y a 1,3 sexylion
de litre d'eau dans les océans, donc 10^21. Et dans une seule goutte d'eau, je dis bien une seule goutte, il
y a 1,7 sexylions de molécules, 10^21. Il y a 200 sextilions d'étoiles dans
l'univers observable, donc 10^23. Et pour plier le game, il y a 7 octillions d'atomes dans notre corps humain, donc
10^28. Donc c'est assez intéressant de faire cette échelle de valeur parce qu'on se rend compte qu'au final la
nature et l'être humain restent quand même plus colossal en terme de quantité. Bon, quantité de je pourrais pas dire
quoi parce qu'on peut pas le déterminer aujourd'hui et ça permet de pouvoir se visualiser concernant nature, être
humain et LLM.

## 5:04 - Comment l'IA comprend ton texte

On passe ensuite à la tokenisation. Donc il y a beaucoup de personnes qui ne comprennent toujours pas comment LIA comprend un texte parce
que c'est pas forcément facile pour n'importe quel débutant. Par exemple, si toi tu es écrit dans un promptte "Bonjour, ça va ?" Donc elle va le
découper en morceau, ce qu'on appelle les tokens. Bonjour, virgule, ça va par exemple. Donc chaque morceau contient un
numéro. Chacun a son numéro, on va dire son identifiant. Ensuite, on a la boîte noire qui vient s'intégrer ici. Donc
représentation, chaque numéro devient un point dans un espace mathématique qui peut aller jusqu'à 16000 dimensions, mais on y reviendra plus tard. Il y a
les connexions. Donc chaque mot regarde les autres pour apprendre le sens. Et on a la prédiction, donc l' deviner le mot
suivant le plus logique. Donc même les créateurs ne comprennent pas ce qu'il se passe ici dans cette boîte noire. C'est imprédictible pour un humain. Ensuite,
il y a une génération mot par mot. Donc ça c'est le mot numéro 1, mot numéro 2, mot numéro 3. Donc les LM eux ils ne
voient pas les mots, ils voient tout simplement des chaînes de caractère numériques, donc tout simplement des nombres. Voilà, des numéros. Ça fait une
reconversion en texte, donc des numéros au texte. Donc salut, ça va bien ? Ça c'est la réponse du LLM qu'on voit à une
vitesse colossale. Donc le résumé c'est qu'on passe de texte, numéro boîte noire numéro réponse.

## 6:11 - De token à vecteur

Maintenant qu'on a
compris ce qui était un token, nous allons décortiquer du token à un vecteur. Donc c'est quand Lia va donner du sens au mot. Donc le token, c'est un
morceau de mots comme on l'a vu, roi, reine, homme par exemple. Donc chaque token, on l'a déjà vu, a un numéro. Le numéro va devenir un vecteur. Donc par
exemple dans le mot roi, il y a peut-être environ 1500 nombres. Voilà, c'est une suite colossale de nombres.
C'est énorme. Donc chaque nombre capture une caractéristique du mot. Les mots les plus proches est égal sens proche. Donc
roi va être plus proche de Ren, Paris, France, chien, chat, homme, femme. Voilà, ils vont avoir une proximité.
femme plus proches de Rennes, homme plus proche de roi et par catégorisation animaux, géographie, royauté. On peut
calculer avec les mots, c'est très peu dit sur le marché mais on peut faire roi moins homme plus femme ça veut dire
Rennes. Paris moins France plus Japon, ça veut dire Tokyo. Parce que l'IA a classifié tout simplement Paris était
une capitale. Donc si on fait France plus Japon, il en déduit Tokyo. Bien sûr, pas tous les LM. Chacun a sa
propre, on va dire hiérarchie de d'information induite. Pourquoi c'est puissant ? Un seul mot est égal pas de
sens pour l'IA. Ça n'a pas de sens. Tout ce que tu écrit, ça n'a aucun sens pour elle. Un vecteur, c'est égal à une position dans l'espace du sens et
comprend via les distances entre les vecteurs. Donc comme on l'a vu dans ce nuage de point qu'on pourrait appeler
nuage de point sémantique. Bien sûr, il y a des millions voire des milliards de connexions. Là, je te fais une petite
représentation. Donc, ce qu'il faut retenir là-dedans, c'est que Lia ne lit pas les mots, elle les place dans un espace mathématique. Plus deux mots sont
proches dans cet espace, plus ils ont un sens similaire.

## 7:40 - L'arithmétique des concepts

Parlons maintenant de l'arithmétique des concepts. Si tu ne
comprends pas très bien ce terme arithmétique, ce n'est pas très grave. Tu peux demander à Lia te former, même moi, j'écoutais pas bien à l'école et
c'est une raison pour laquelle je suis en train de te parler devant que je n'ai pas bien écouté à l'école. J'ai bien fait. Donc le roi, c'est un vecteur
masculin plus pouvoir, moins homme plus femme, c'est une opération vectorielle et environ renne, donc c'est le résultat
mathématique réel. Donc c'est un résultat mathématique qui peut fonctionner avec le LLM A, mais peut-être pas avec le LLM B. Donc c'est
un calcul mathématique réel qui donne ce résultat dans l'espace vectoriel. Paris- France + Italie est environ égal à Rome.
Donc ces vecteurs-là en fait, ils vont permettre des opérations algébriques sur des concepts qui restent abstraits.

## 8:18 - Embeddings

Nous allons voir les embeddings. Tu as déjà
peut-être entendu parler de ce terme-là. Donc pour le vulgariser le plus simplement possible, un mbending, c'est comment Nia va transformer un mot en une
liste de chiffres qui va capturer son sens en contexte. Le mot banque tout seul ne veut rien dire de précis. Il y a
le transforme en chiffres différents selon la phrase. Par exemple, retirer de l'argent à la banque, les chiffres sont
proches de argent, compte et guichets. Par exemple, la banque de sable, les chiffres sont proches de rivière,
poisson, nature. Donc, il faut bien comprendre que ce n'est pas un dictionnaire figé. Li lu des milliards de textes pour apprendre que le même mot
change de sens selon ce qu'il entoure, donc son contexte, on va dire, autour d'elle. Et l'imbendings va refléter ça.
Ceci est une représentation d'un projecteur d'embeddings à multidimension. Donc on peut voir que on
peut tourner l'élément. Donc là on a la chance de pouvoir le faire tourner en 3D, rentrer dedans. Donc nous avons un
MBX avec des mots. Par exemple, là on voit que genre est très proche de acronyme. Bien sûr pouvons intégrer via
cet outil là. On peut lo des données. Donc on peut très bien importer notre propre nuage de point. Donc si on a si
on a envie de mettre roi à côté de camion, on peut le faire. Si on regarde ici, voilà, Glossery est à côté de
patent. Bref, ça nous permet un petit peu d'avoir une vision globale et de pouvoir se déplacer dans un espace
multidimensionnel. Je trouve que c'est quand même génial pour la compréhension.

## 9:34 - Nuage de points sémantique

Parlons maintenant du nuage de point sémantique. C'est vrai que je l'ai déjà
abordé dans plusieurs vidéos, mais là aujourd'hui, on va tout décortiquer de A à Z. Tous les mbendings d'un modèle forment un nuage de point, donc la carte
de comment le modèle comprend le monde. Les concepts liés se regroupent naturellement comme on l'a vu précédemment, on l'a vulgarisé en 2D et
en 3D. Les émotions ensemble, les métiers ensemble, la programmation ensemble et cetera. Le point crucial
qu'il faut savoir, c'est que le nuage de GPT 5.2 est radicalement différent de celui que Clode 4.5 ou 4.6 au plus pour
le dernier. C'est là toute la différence. C'est pour ça que je répète depuis tant de temps, tu prends le même prompt, tu le mets dans plusieurs et tu
compares les résultats et tu les analyses, tu travailles sur ton prompt parce que tu vas pouvoir le mettre dans plusieurs univers différents, donc des
univers sémantiques. Donc en gros, le même prompte te traverse deux réalités distinctes. Pour encore mieux comprendre ce terme de nuage de point sémantique,
et bien ici, tu as une représentation donc par sectorisation, technologie, nourriture, émotion, nature, pouvoirs.
Donc là, je peux les activer, désactiver comme je le souhaite. Imaginons, je mets les émotions. On voit que dans ce nuage de point, si je vais surur et bien il y
a une suite de nombre comme on l'a vu, embeddings pour le mot bonheur. Voilà, joie qui sont classifié dans émotion. Et
si je désactive tout, on voit que voilà, ils sont tous sectorisés ici. Nature, émotion, transport et cetera et cetera.
Donc li elle ne voit pas les mots, elle voit des positions dans un espace mathématique. C'est vraiment ce qu'il faut comprendre et les mots qui se
ressemblent sont regroupés automatiquement. Attention, peut-être que il y a une IA, par exemple, chinoise, un modèle de dipsic qui va
classifier, je sais pas, par exemple, cuisine, qui va lui mettre plus d'importance vers pouvoir, par exemple. Ça n'a rien à voir ce que je suis en
train de te dire, mais il faut que tu comprennes que chacun l'entraîne comme il veut.

## 10:50 - Au-delà de la perception humaine

Allons au-delà de la perception humaine parce que il est vrai que tout
est une problématique ou tout est une solution de perception. Les LLM, ils opèrent dans des espaces à 768, 4096,
8192 voire 16384 dimensions. Sache-le, toi qui est un humain qui regarde cette
vidéo, tu ne peux percevoir que trois dimensions spatiales. Alors, je m'adresse au robot qui va voir cette vidéo en 2037. Oui, toi tu as réussi à
dépasser ces trois dimensions, mais en tout cas actuellement lorsque cette vidéo est tournée en 2026, nous les
humains, on peut aller jusqu'à 3. Donc il faut quand même comprendre que nous travaillons avec un outil dont l'espace de travail nous est physiologiquement
inaccessible. Je sais pas si tu te rends compte, on parle de 16384 dimensions, nous ne pouvons en percevoir que trois.
Un visuel vaut mieux que 1000 mots. Donc par exemple là, on a un espace 3D. Donc ça, tu connais hein, ça c'est un espace
3D. On a tous travaillé sur ça au collège, des projets comme ça. On a déjà vu des espaces trois dimensions. Donc largeur, hauteur, profondeur. Voilà.
Ensuite, on a du 768 dimension. Donc là, peut-être qu'on le voit pas si bien mais tu vois, on peut zoomer dessus, on peut se déplacer. Donc chaque point a 768
coordonnées. Alors en fait de 768 à 16384, tu verras pas beaucoup la différence parce que LIA c'est Lia,
c'est Claude 4.6 au plus qui a fait cette représentation mais pour elle c'est impossible à visualiser, c'est
impossible à créer. Donc en fait là on est dans la théorie pure et dure, on est dans comment dire le fantasme, c'est impossible de représenter ça. Donc je te
laisse imaginer à ta propre créativité, à ta propre perception de à quoi ça ressemble un espace à 16384 dimensions.
Personnellement, je ne suis pas assez intelligent et je n'ai pas assez de créativité pour imaginer ce que ça peut représenter. Il faut savoir chaque
dimension va capturer des éléments ou des choses différentes. Les dimensions 1 à 50, alors bien sûr, ça peut différer
suivant certaines mais là dans dans le principe on y est. Pour les dimensions 1 à 50, ça va être les fondamentaux
grammaticaux, partie du discours, genre, nombre, temps. Ensuite, dans les dimensions 51 à 200, ça va être des
relations sémantiques, synonymie, antonymie, contexte d'usage et cetera. Ensuite, dans les 201 à 500, ça va être
les nuances culturelles, donc plutôt les registres de langue, le domaine de spécialité, les connotations. On est un
peu plus profond dans la compréhension. Par contre, quand on dépasse les 1000 dimensions, là on est sur les patterns profonds que les chercheurs ne peuvent
même pas nommer.
