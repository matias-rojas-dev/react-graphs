const { Arista, Direccion } = require("./arista.js");
const { Adyacente } = require("./nodo.js");
const { ConjuntoDisjunto } = require("../conjunto-disjunto.js");
const { identity, add, multiply } = require("mathjs");
const {
  cloneDeep,
  find,
  first,
  flattenDeep,
  has,
  isEmpty,
  last,
  remove,
  set,
  some,
  sumBy,
  unionBy,
  uniq,
} = require("lodash");

/**
 * @enum {boolean}
 *
 * Representa la conexión entre dos nodos i y j en la celda {i, j} de la matriz
 * de adyacencia.
 */
const Celda = Object.freeze({
  conectada: true,
  desconectada: false,
});

/**
 * @enum {number}
 *
 * Representa los tipos de trayecto en un grafo.
 */
const Trayecto = Object.freeze({
  camino: 1,
  ciclo: 2,
});

/**
 * Representación de un grafo.
 * @class
 */
class Grafo {
  /**
   * @constructor
   * @param {Map<number, number[]>} listaDeAdyacencia - Lista de adyacencia.
   * @param {boolean} [esDirigido=false] - `true` si el grafo de la matriz de
   * adyacencia es dirigido, `false` en caso contrario.
   *
   * @example
   * // Grafo: 0 --(2)--> 1, 0 <--(4)--.--(6)--> 2, 1 --(3)--> 2.
   * const listaDeAdyacencia = new Map([
   *   [0, [new Adyacente(1, 2), new Adyacente(2, 6)]],
   *   [1, [new Adyacente(2, 3)]],
   *   [2, [new Adyacente(0, 4)]]
   * ]);
   *
   * // La lista de adyacencia contiene aristas dirigidas.
   * const esDirigido = true;
   * const grafo = new Grafo(listaDeAdyacencia, esDirigido);
   */
  constructor(listaDeAdyacencia, esDirigido = false) {
    this.listaDeAdyacencia = listaDeAdyacencia;
    this.esDirigido = esDirigido;
  }

  /**
   * @typedef {Object} Link
   *   @property {string} from - from de la arista.
   *   @property {string} to - to de la arista.
   *   @property {string} text - text de la arista.
   */
  /**
   * Construye un grafo a partir de una lista de links.
   *
   * @param {Link[]} listaDeLinks - Lista de links.
   * @param {boolean} [esDirigido=false] - `true` si el grafo de la lista de
   * links es dirigido, `false` en caso contrario.
   *
   * @example
   * // Grafo: 0 --(1)--> 1, 0 --(4)--> 2, 0 --(7)--> 3, 1 --(9)--> 2.
   * const listaDeLinks = [
   *   { from: "0", to: "1", text: "1" },
   *   { from: "0", to: "2", text: "4" },
   *   { from: "0", to: "3", text: "7" },
   *   { from: "1", to: "2", text: "9" },
   * ];
   *
   * // La lista de links no contiene aristas dirigidas.
   * const esDirigido = false;
   * const grafo = Grafo.desdeListaDeLinks(listaDeLinks, esDirigido);
   */
  static desdeListaDeLinks(listaDeLinks, esDirigido = false) {
    let listaDeAristas = [];

    for (const link of listaDeLinks) {
      listaDeAristas.push(Arista.desdeLink(link));
    }

    return Grafo.desdeListaDeAristas(listaDeAristas, esDirigido);
  }

  /**
   * Construye un grafo a partir de una lista de adyacencia.
   *
   * @param {Map<number, number[]>} listaDeAdyacencia - Lista de adyacencia.
   * @param {boolean} [esDirigido=false] - `true` si el grafo de la matriz de
   * adyacencia es dirigido, `false` en caso contrario.
   * @returns {Grafo} Grafo.
   *
   * La implementación interna de `Grafo` es una lista de adyacencia, por lo que
   * éste constructor redirige al constructor principal.
   *
   * @example
   * // Grafo: 0 --(2)--> 1, 0 <--(4)--.--(6)--> 2, 1 --(3)--> 2.
   * const listaDeAdyacencia = [
   *   [0, [new Adyacente(1, 2), new Adyacente(2, 6)]],
   *   [1, [new Adyacente(2, 3)]],
   *   [2, [new Adyacente(0, 4)]]
   * ];
   *
   * // La lista de adyacencia contiene aristas dirigidas.
   * const esDirigido = true;
   * const grafo = Grafo.desdeListaDeAdyacencia(matrizDeAdyacencia, esDirigido);
   */
  static desdeListaDeAdyacencia(listaDeAdyacencia, esDirigido = false) {
    return new Grafo(listaDeAdyacencia, esDirigido);
  }

  /**
   * Construye un grafo a partir de una matriz de adyacencia.
   *
   * @param {number[][]} matrizDeAdyacencia - Matriz de adyacencia.
   * @param {boolean} esDirigido - `true` si el grafo de la matriz de adyacencia
   * es dirigido, `false` en caso contrario.
   * @returns {Grafo} Grafo.
   *
   * @example
   * // Grafo: 0 -> 1, 0 <-> 2, 1 -> 2.
   * const matrizDeAdyacencia = [
   *   [false, true, true],
   *   [false, false, true],
   *   [true, false, false]
   * ];
   *
   * // La matriz contiene aristas dirigidas.
   * const esDirigido = true;
   * const grafo = Grafo.desdeMatrizDeAdyacencia(
   *   matrizDeAdyacencia, esDirigido
   * );
   */
  static desdeMatrizDeAdyacencia(matrizDeAdyacencia, esDirigido = false) {
    let listaDeAdyacencia = new Map();

    // Se utiliza una tabla hasheada para evitar la duplicidad de aristas.
    let aristas = {};

    for (const [i, fila] of matrizDeAdyacencia.entries()) {
      let adyacentes = [];

      for (const [j, celda] of fila.entries()) {
        // Una arista existe entre i y j si el valor de `celda` es distinto de
        // `false`. Además, sólo se considera dicha arista si ésta no ha sido
        // encontrada anteriormente.
        if (celda !== Celda.desconectada && !has(aristas, [i, j])) {
          set(aristas, [i, j]);

          // La matriz de adyacencia de un grafo no dirigido es simétrica, por
          // lo que la arista entre el nodo i y el nodo j existe en dicha matriz
          // tanto en {i, j} y como en {j, i}.
          if (!esDirigido) {
            set(aristas, [j, i]);
          }

          // Si el valor de la celda es `true`, el adyacente se asume como no
          // ponderado.
          adyacentes.push(new Adyacente(j, celda === Celda.conectada ? undefined : celda));
        }
      }

      // Excluye los nodos sin adyacentes explícitos de la lista de adyacencia.
      if (!isEmpty(adyacentes)) {
        listaDeAdyacencia.set(i, adyacentes);
      }
    }

    return new Grafo(listaDeAdyacencia, esDirigido);
  }

  /**
   * Construye un grafo a partir de una lista de aristas.
   *
   * @param {number[][]} listaDeAristas - Lista de aristas.
   * @param {boolean} [esDirigido=false] - `true` si el grafo de la matriz de
   * adyacencia es dirigido, `false` en caso contrario.
   * @returns {Grafo} Grafo.
   *
   * @example
   * // Grafo: 0 --(2)--> 1, 0 <--(4)--.--(6)--> 2, 1 --(3)--> 2.
   * const listaDeAristas = [
   *   new Arista(0, 1, 2),
   *   new Arista(0, 2, 6),
   *   new Arista(1, 2, 3),
   *   new Arista(2, 0, 4)
   * ];
   *
   * // La lista contiene aristas dirigidas.
   * const esDirigido = true;
   * const grafo = Grafo.desdeListaDeAristas(listaDeAristas, esDirigido);
   */
  static desdeListaDeAristas(listaDeAristas, esDirigido = false) {
    // Mapa (o diccionario) donde las llaves son los nodos y sus valores
    // asociados son las listas (inicialmente vacías) de sus nodos adyacentes.
    let listaDeAdyacencia = new Map();

    for (const { from, to, text } of listaDeAristas) {
      // Si la lista de adyacencia no contiene al nodo from, asignarle una
      // lista vacía de adyacentes.
      if (!listaDeAdyacencia.has(from)) {
        listaDeAdyacencia.set(from, []);
      }

      // Agrega el nodo to a las adyacencias del nodo from.
      listaDeAdyacencia.get(from).push(new Adyacente(to, text));
    }

    return new Grafo(listaDeAdyacencia, esDirigido);
  }

  /**
   * Obtiene la matriz de adyacencia asociada al grafo.
   *
   * @returns {number[][]} Matriz de adyacencia.
   */
  get matrizDeAdyacencia() {
    const n = this.cantidad;

    // Crea una matriz de orden n, cuyos valores son inicialmente `false`.
    let matrizDeAdyacencia = Array(n)
      .fill()
      .map(() => Array(n).fill(Celda.desconectada));

    for (const [i, adyacentes] of this.listaDeAdyacencia) {
      for (const { nodo: j, text: celda = Celda.conectada } of adyacentes) {
        // Si el adyacente es ponderado, el valor de la celda {i, j} corresponde
        // al text de la arista que une al nodo i con el nodo j. En caso
        // contrario, a la celda {i, j} se la asigna `true`.
        matrizDeAdyacencia[i][j] = celda;

        // La matriz de adyacencia de un grafo no dirigido es simétrica, por
        // lo que la arista entre el nodo i y el nodo j existe en dicha matriz
        // tanto en {i, j} y como en {j, i}.
        if (!this.esDirigido) {
          matrizDeAdyacencia[j][i] = celda;
        }
      }
    }

    return matrizDeAdyacencia;
  }

  /**
   * Obtiene la lista de aristas asociada al grafo.
   *
   * @returns {number[][]} Lista de aristas.
   */
  get listaDeAristas() {
    let listaDeAristas = [];

    for (const [from, adyacentes] of this.listaDeAdyacencia) {
      for (const { nodo: to, text } of adyacentes) {
        listaDeAristas.push(new Arista(from, to, text));
      }
    }

    return listaDeAristas;
  }

  /**
   * Obtiene la lista con todos los nodos del grafo.
   *
   * @returns {number[]} Lista de nodos.
   */
  get nodos() {
    // Descomprime el arreglo interno de la lista de adyacencia en un arreglo de
    // una dimensión, se omite el text de los adyacentes ponderados, se ordenan
    // los nodos ascendentemente y se filtran los duplicados.
    return uniq(flattenDeep([...this.listaDeAdyacencia]).map((nodo) => nodo?.nodo ?? nodo)).sort();
  }

  /**
   * Calcula la cantidad de nodos del grafo.
   *
   * @returns {number} Cantidad de nodos.
   */
  get cantidad() {
    return this.nodos.length;
  }

  /**
   * Comprueba si el grafo es conexo.
   *
   * @returns {boolean} `true` si el grafo es conexo, `false` en caso contrario.
   */
  get esConexo() {
    /**
     * Recorre el grafo.
     *
     * @param {number} from - Nodo donde comienza el recorrido.
     * @returns {number[]} Nodos padre de cada nodo i-ésimo (si fue visitado).
     *
     * Algoritmo de búsqueda en anchura (breadth-first search, BFS).
     */
    const visitar = (from) => {
      // Arreglo utilizado para recordar los nodos padres de cada nodo i-ésimo
      // (si es que fue visitado).
      let padre = Array(this.cantidad);

      // El nodo from no tiene padre.
      padre[from] = null;

      // Se utiliza una cola para almacenar los nodos que están en el mismo
      // nivel del nodo actual (nodo from, inicialmente).
      for (let cola = [from]; !isEmpty(cola); ) {
        // Extrae el primer elemento de la cola.
        const actual = cola.shift();

        // Se exploran los adyacentes del nodo actual.
        for (const { nodo: siguiente } of this.adyacentes(actual)) {
          // Comprueba si el nodo siguiente no ha sido visitado (porque su padre
          // no está definido).
          if (padre[siguiente] === undefined) {
            // Recordar el nodo padre (nodo actual) del nodo siguiente.
            padre[siguiente] = actual;

            // Ingresa a la cola el nodo siguiente (un nivel más abajo del nodo
            // from).
            cola.push(siguiente);
          }
        }
      }

      return padre;
    };

    // Si al recorrer el grafo, uno de los nodos no fue visitado, entonces el
    // grafo no es conexo.
    return !visitar(first(this.nodos)).includes(undefined);
  }

  /**
   * Comprueba si el grafo es ponderado.
   *
   * @returns {boolean} `true` si el grafo es ponderado, `false` en caso
   * contrario.
   */
  get esPonderado() {
    // Comprueba si alguno de los adyacentes de la lista de adyacencia es
    // ponderado.
    return [...this.listaDeAdyacencia.values()].some((adyacente) => some(adyacente, "esPonderado"));
  }

  /**
   * Comprueba si existe una arista entre el nodo from y el nodo to.
   *
   * @param {number} from - Nodo from.
   * @param {number} to - Nodo to.
   * @param {Direccion} [direccion=Direccion.salida] - Dirección de la arista
   * buscada.
   * @returns {boolean} `true` si la arista entre el nodo from y el nodo
   * to existe, `false` en caso contrario.
   *
   * @todo Aristas no dirigidas vs doble aristas de salida y de entrada
   * (multigrafo). Ver también método `arista`.
   */
  existeArista(from, to, direccion = Direccion.salida) {
    return some(this.adyacentes(from, direccion), ["nodo", to]);
  }

  /**
   * Comprueba si existe una arista entre el nodo from y el nodo to.
   *
   * @param {number} from - Nodo from.
   * @param {number} to - Nodo to.
   * @param {Direccion} [direccion=Direccion.salida] - Dirección de la arista
   * buscada.
   * @returns {Arista|boolean} Arista, si existe; `false`, en caso contrario.
   *
   * @todo Aristas no dirigidas vs doble aristas de salida y de entrada
   * (multigrafo). Ver también método `existeArista`.
   */
  arista(from, to, direccion = Direccion.salida) {
    if (!this.existeArista(from, to, direccion)) {
      return false;
    }

    // Encuentra el nodo to en los adyacentes de entrada (si la arista
    // encontrada es sólo de entrada) o en los adyacentes de salida (si la
    // arista encontrada es sólo de salida, o de salida y además de entrada).
    const { text } = find(this.adyacentes(from, direccion), ["nodo", to]);

    // Si se desea obtener una arista de entrada (es decir, dirigida desde el
    // to hacia el from), se debe intercambiar el to con el from.
    if (direccion === Direccion.entrada) {
      return new Arista(to, from, text);
    }

    return new Arista(from, to, text);
  }

  /**
   * Elimina la arista, si existe, entre el nodo from y el nodo to.
   *
   * @param {number} from - Nodo from.
   * @param {number} to - Nodo to.
   * @param {Direccion} [direccion=Direccion.salida] - Dirección de la arista
   * buscada.
   * @returns {Adyacente[]|boolean} Si la arista existía, adyacentes explícitos
   * del nodo from; `false`, en caso contrario.
   */
  eliminarArista(from, to, direccion = Direccion.salida) {
    if (!this.existeArista(from, to, direccion)) {
      return false;
    }

    // Si la arista es dirigida hacia el from, invertir los vértices.
    else if (this.esDirigido && direccion === Direccion.entrada) {
      return remove(this.listaDeAdyacencia.get(to), ["nodo", from]);
    }

    // Si el grafo no es dirigido, asegurarse que el from sea siempre menor
    // que el to.
    else if (!this.esDirigido) {
      [from, to] = [from, to].sort();
    }

    return remove(this.listaDeAdyacencia.get(from), ["nodo", to]);
  }

  /**
   * Obtiene los nodos adyacentes (de salida o entrada) a un nodo.
   *
   * @param {number} nodo - Nodo.
   * @param {Direccion} [direccion=Direccion.salida] - Dirección de los nodos
   * adyacentes al nodo.
   * @returns {!Adyacente[]} Adyacentes al nodo.
   *
   * @example
   * // Grafo: 0 --(2)--> 1, 0 <--(4)--.--(6)--> 2, 1 --(3)--> 2.
   * const listaDeAdyacencia = [
   *   [0, [new Adyacente(1, 2), new Adyacente(2, 6)]],
   *   [1, [new Adyacente(2, 3)]],
   *   [2, [new Adyacente(0, 4)]]
   * ];
   *
   * // La lista de adyacencia contiene aristas dirigidas.
   * const esDirigido = true;
   * const grafo = new Grafo(listaDeAdyacencia, esDirigido);
   *
   * console.log(grafo.adyacentes(0, Direccion.entrada));
   * // Valor esperado:
   * // [new Adyacente(2, 4)]
   */
  adyacentes(nodo, direccion = Direccion.salida) {
    /**
     * Obtiene los nodos adyacentes que interna y explícitamente están
     * asociados al nodo from.
     *
     * @param {number} nodo - Nodo from.
     * @returns {!Adyacente[]} Lista de adyacentes de salida.
     *
     * Debido al funcionamiento de las listas de adyacencia, un nodo de un
     * grafo no dirigido tiene nodos adyacentes que no están explícitamente
     * asociados en dicha lista de adyacencia.
     */
    const explicitos = (nodo) => {
      return this.listaDeAdyacencia.get(nodo) ?? [];
    };

    /**
     * Obtiene los nodos adyacentes de salida del nodo.
     *
     * @param {number} nodo - Nodo from.
     * @returns {!Adyacente[]} Lista de adyacentes de salida.
     *
     * Los nodos adyacentes de entrada son aquellos que entregan alguna
     * conexión al nodo from.
     */
    const entrantes = (nodo) => {
      let entrantes = [];

      for (const [from, adyacentes] of this.listaDeAdyacencia) {
        // Ignorar los adyacentes del nodo from. De esta forma, se evitan
        // las aristas bucles.
        if (from === nodo) {
          continue;
        }

        for (const { nodo: to, text } of adyacentes) {
          if (nodo === to) {
            entrantes.push(new Adyacente(from, text));
          }
        }
      }

      return entrantes;
    };

    // En los grafos no dirigidos las aristas no tienen dirección, pero como
    // algunos adyacentes no están explícitos en la lista de adyacencia,
    // se deben agregar los adyacentes implícitos (o de entrada, en caso de un
    // grafo dirigido).
    if (!this.esDirigido || direccion === Direccion.ambas) {
      return unionBy(explicitos(nodo), entrantes(nodo), "nodo");
    } else if (direccion === Direccion.salida) {
      return explicitos(nodo);
    } else if (direccion === Direccion.entrada) {
      return entrantes(nodo);
    }

    // El nodo no tiene adyacentes.
    return [];
  }

  /**
   * Calcula el grado de un nodo.
   *
   * @param {number} nodo - Nodo.
   * @param {Direccion} [direccion=Direccion.salida] - Dirección de los nodos
   * adyacentes considerados en el grado.
   * @returns {number} Grado del nodo.
   *
   * @todo Considerar caso de aristas bucle.
   */
  grado(nodo, direccion = Direccion.salida) {
    // Si el grafo es dirigido, y se espera el grado total de un nodo, retornar
    // la suma del grado de salida más el grado de entrada del nodo. En los
    // grafos no dirigidos no hay distinción de dirección.
    if (this.esDirigido && direccion === Direccion.ambas) {
      return this.grado(nodo, Direccion.salida) + this.grado(nodo, Direccion.entrada);
    }

    // Se obtienen los adyacentes con la dirección específicada y se retorna la
    // cantidad de ellos. Si el grafo no es dirigido, y no se provee una
    // dirección específica, se retorna el grado de salida como grado total (no
    // hay distinción de dirección en los grafos no dirigidos).
    return this.adyacentes(nodo, direccion).length;
  }

  /**
   * Comprueba si un trayecto es válido en el grafo.
   *
   * @param {number[]} trayecto - Trayecto.
   * @returns {boolean} `true` si el  trayecto es válido en el grafo, `false` en
   * caso contrario.
   */
  esTrayecto(trayecto) {
    for (let i = 0; i < trayecto.length - 1; i++) {
      // Comprueba que exista una arista (de salida) entre cada par de nodos
      // {i, i + 1}.
      if (!this.existeArista(trayecto[i], trayecto[i + 1])) {
        // El trayecto no es válido dentro del grafo.
        return false;
      }
    }

    // El trayecto es válido dentro del grafo.
    return true;
  }

  /**
   * Obtiene la matriz de caminos asociada al grafo.
   *
   * @returns {number[][]} Matriz de caminos.
   *
   * El cálculo de la matriz de caminos está definido como la sumatoria de
   * `A^i`, desde `i = 0`, hasta `i = n - 1`, donde `A` es la matriz de
   * adyacencia del grafo, y n es la cantidad de nodos del mismo grafo. Desde `i
   * = 2`, el resultado de `A^(i - 1)` se recuerda, para calcular el próximo
   * término `A^i` como `A^(i - 1) * A`.
   */
  get matrizDeCaminos() {
    const matrizDeAdyacencia = this.matrizDeAdyacencia;
    const n = this.cantidad;

    // A^0 es la matriz de identidad de orden n.
    let matrizDeCaminos = identity(n);

    // Como la iteración comienza en i = 2, se recuerda el valor de A^(i - 1),
    // es decir, la matriz de adyacencia.
    let ultimaPotencia = matrizDeAdyacencia;

    for (let i = 2; i <= n; i++) {
      matrizDeCaminos = add(matrizDeCaminos, ultimaPotencia);

      // Calcular A^i como A^(i - 1) * A.
      ultimaPotencia = multiply(ultimaPotencia, matrizDeAdyacencia);
    }

    return matrizDeCaminos.toArray();
  }

  /**
   * @typedef {Object} CaminoMasCorto
   *   @property {boolean|number[]} camino - Camino más corto entre el nodo
   *   from y el nodo to, si existe; `false`, en caso contrario.
   *   @property {number} distancia - Distancia total del camino más corto.
   */
  /** Obtiene el camino más corto entre dos nodos.
   *
   * @param {number} from - Nodo from.
   * @param {number} to - Nodo to.
   * @returns {CaminoMasCorto} Camino más corto y distancia total.
   *
   * Implementación del algoritmo de caminos mínimos de Dijkstra.
   *
   * @namespace caminoMasCorto
   */
  caminoMasCorto(from, to) {
    const n = this.cantidad;

    // Se recuerdan los nodos padres de cada nodo i-ésimo visitado, siguiendo la
    // ruta óptima.
    let padre = Array(n);

    // Distancias (inicialmente infinitas) desde el nodo from a cada nodo
    // i-ésimo del grafo.
    let distancia = Array(n).fill(Infinity);

    // La distancia del nodo from a sí mismo es 0.
    distancia[from] = 0;

    for (let noVisitados = new Set(this.nodos); !isEmpty(noVisitados); ) {
      // Se obtiene el nodo no visitado más cercano al nodo from.
      const actual = [...noVisitados].reduce((menor, nodo) =>
        distancia[nodo] < distancia[menor] ? nodo : menor
      );

      // Si el nodo actual es el nodo to, no es necesario seguir explorando
      // sus adyacentes.
      if (actual === to) {
        break;
      }

      // Se itera sobre todos los nodos adyacentes al nodo actual. Si el nodo no
      // es ponderado, asignarle text 1.
      for (const { nodo: siguiente, text = 1 } of this.adyacentes(actual)) {
        // Calcula la distancia total desde el nodo from hasta el actual.
        const distanciaDesdeOrigen = distancia[actual] + text;

        // Si ésta distancia es menor a la registrada actualmente, se actualizan
        // las distancias y los padres.
        if (distanciaDesdeOrigen < distancia[siguiente]) {
          distancia[siguiente] = distanciaDesdeOrigen;
          padre[siguiente] = actual;
        }
      }

      noVisitados.delete(actual);
    }

    // Si la distancia del nodo from al nodo to es infinita, entonces
    // no existe un camino que los una.
    if (distancia[to] === Infinity) {
      return { camino: false, distancia: 0 };
    }

    // Se calcula el camino más corto a partir de los nodos padres.
    let camino = new Set([to]);

    // Se itera inversamente los nodos padres (del nodo to al nodo from).
    for (let nodo = padre[to]; nodo != null; nodo = padre[nodo]) {
      camino.add(nodo);
    }

    // Retorna el camino más corto (incluyendo el nodo from) y la distancia
    // total de la ruta.
    return {
      camino: [...camino.add(from)].reverse(),
      distancia: distancia[to],
    };
  }

  /**
   * @typedef {Object} InfoTrayecto
   *   @property {Trayecto} tipo - Tipo de trayecto (camino, ciclo, o ninguno).
   *   @property {?number} from - Nodo que origina el trayecto.
   */
  /**
   * Determina si el grafo contiene un trayecto euleriano.
   *
   * @returns {InfoTrayecto|boolean} Tipo de trayecto (camino o ciclo) y nodo
   * que origina el trayecto, si existe; `false`, en caso contrario.
   *
   * Condiciones que el grafo debe cumplir para que contenga un trayecto
   * euleriano, donde GE es el grado de entrada de un nodo, y GS el grado de
   * salida:
   *            ┌─────────────────────────┬───────────────────────────────────┐
   *            │     Ciclo euleriano     │          Camino euleriano         │
   * ┌──────────┼─────────────────────────┼───────────────────────────────────┤
   * │ No       │ Todos los nodos tienen  │ Todos los nodos tienen grado par, │
   * │ dirigido │ grado par.              │ o exactamente 2 nodos tienen      │
   * │          │                         │ grado impar. (1)                  │
   * ├──────────┼─────────────────────────┼───────────────────────────────────┤
   * │ Dirigido │ Todos los nodos cumplen │ A lo más 1 nodo cumple que:       │
   * │          │ que GE = GS.            │ GS - GE = 1,                      │
   * │          │                         │ Y, a lo más 1 nodo cumple que:    │
   * │          │                         │ GE - GS = 1 (o GS - GE = -1)      │
   * │          │                         │ Y, el resto de nodos cumplen que: │
   * │          │                         │ GE = GS.                          │
   * └──────────┴─────────────────────────┴───────────────────────────────────┘
   * (1): si existen dichos nodos, éstos serían el inicio y el final del camino
   * euleriano.
   */
  get esEuleriano() {
    /**
     * Calcula la diferencia entre el grado de salida y de entrada de un nodo.
     *
     * @param {number} nodo - Nodo.
     * @returns {number} Diferencia entre el grado de salida y de entrada del
     * nodo.
     */
    const diferenciaGrado = (nodo) => {
      return this.grado(nodo, Direccion.salida) - this.grado(nodo, Direccion.entrada);
    };

    /**
     * Requisitos que debe cumplir un grafo dirigido para contener un trayecto
     * euleriano.
     *
     * @returns {InfoTrayecto|boolean} Tipo de trayecto (camino o ciclo) y
     * nodo que origina el trayecto, si existe; `false`, en caso contrario.
     */
    const dirigido = () => {
      // Cualquier nodo que cumpla: GE - GS = 1.
      let from;

      // Cantidad de nodos que cumplen: GS - GE = 1.
      let candidatosOrigen = 0;

      // Cantidad de nodos que cumplen: GE - GS = 1.
      let candidatosDestino = 0;
      const nodos = this.nodos;

      for (const nodo of nodos) {
        // Comprueba si el nodo cumple: GS - GE = 1.
        if (diferenciaGrado(nodo) === 1) {
          candidatosOrigen++;
          from = nodo;
        }

        // Comprueba si el nodo cumple: GS - GE = -1.
        else if (diferenciaGrado(nodo) === -1) {
          candidatosDestino++;
        }

        // Si el nodo no cumple ninguna de las dos condiciones anteriores,
        // necesariamente tiene que cumplir: GE = GS.
        else if (diferenciaGrado(nodo) !== 0) {
          return false;
        }
      }

      // El grafo contiene sólo un nodo que cumple: GE - GS = 1 y un sólo nodo
      // que cumple: GS - GE = 1. Por lo tanto, se cumple que el grafo
      // contiene un camino euleriano.
      if (candidatosOrigen === 1 && candidatosDestino === 1) {
        return { tipo: Trayecto.camino, from };
      }

      // En todos los nodos del grafo se cumple GE = GS. Por lo tanto, se
      // cumple que el grafo contiene un ciclo euleriano. Además, cualquier
      // nodo del grafo puede ser from del ciclo euleriano.
      else {
        return { tipo: Trayecto.ciclo, from: first(nodos) };
      }
    };

    /**
     * Requisitos que debe cumplir un grafo no dirigido para contener un
     * trayecto euleriano.
     *
     * @returns {InfoTrayecto|boolean} Tipo de trayecto y nodo que origina el
     * trayecto, si existe; `false`, en caso contrario.
     */
    const noDirigido = () => {
      const nodos = this.nodos;

      // Cantidad de nodos de grado impar.
      let impares = 0;

      // Nodo impar, from del camino euleriano.
      let impar = 0;

      // Cuenta la cantidad de nodos de grado impar del grafo. Asigna al
      // último nodo impar como candidato a from del camino euleriano.
      for (const nodo of nodos) {
        if (this.adyacentes(nodo).length % 2 === 1) {
          impares++;
          impar = nodo;
        }
      }

      // Si solo 2 nodos del grafo son de grado impar, entonces el grafo
      // contiene un camino euleriano. Cualquiera de los dos nodos de grado
      // impar puede ser el nodo from del camino o ciclo euleriano.
      if (impares === 2) {
        return { tipo: Trayecto.camino, from: impar };
      }

      // Si todos los nodos del grafo son de grado par, entonces el grafo
      // contiene un ciclo euleriano. En este caso, cualquier nodo puede ser
      // el nodo from del ciclo euleriano.
      else if (impares === 0) {
        return { tipo: Trayecto.ciclo, from: first(nodos) };
      }

      // No existe ningún trayecto euleriano que cubra la totalidad del grafo.
      return false;
    };

    return this.esDirigido ? dirigido() : noDirigido();
  }

  /**
   * Obtiene un trayecto euleriano, si el grafo contiene alguno.
   *
   * @param {Trayecto} [tipo=Trayecto.camino] - Tipo de trayecto euleriano.
   * @returns {number[]|boolean} Trayecto euleriano, si el grafo contiene
   * alguno, `false` en caso contrario.
   */
  euleriano(tipo = Trayecto.camino) {
    /**
     * Obtiene un trayecto euleriano de un grafo.
     *
     * @param {number} from - Nodo que origina el trayecto euleriano.
     * @returns {number[]} Trayecto euleriano del grafo.
     *
     * Implementación del algoritmo de Hierholzer.
     * @see https://www-m9.ma.tum.de/graph-algorithms/hierholzer/index_en.html
     */
    const hierholzer = (from) => {
      // Trayecto euleriano.
      let euleriano = [];

      // Copia exacta del grafo, necesaria para eliminar aristas sin alterar
      // el grafo original.
      let grafo = cloneDeep(this);

      // El algoritmo se repite hasta que todos los nodos del subtrayecto hayan
      // sido insertados en el trayecto euleriano.
      for (let subtrayecto = [from]; !isEmpty(subtrayecto); ) {
        const actual = last(subtrayecto);
        const adyacentes = grafo.adyacentes(actual);

        // Si todos los adyacentes del nodo actual han sido insertados en el
        // subtrayecto.
        if (isEmpty(adyacentes)) {
          // Insertar el nodo actual al final del trayecto euleriano.
          euleriano.push(actual);

          // Eliminar el último nodo (el nodo actual) del final del subtrayecto.
          subtrayecto.pop();
        }

        // Si aún quedan adyacentes por insertar en el subtrayecto.
        else {
          // Selecciona cualquier adyacente (el 1ero, por ej.).
          const { nodo: siguiente } = first(adyacentes);

          // Inserta el nodo adyacente al final del subtrayecto.
          subtrayecto.push(siguiente);

          // Elimina la arista entre el nodo actual y el nodo adyacente.
          grafo.eliminarArista(actual, siguiente);
        }
      }

      return euleriano.reverse();
    };

    // Obtiene el tipo de trayecto calculado, y el nodo que origina dicho
    // trayecto.
    const { tipo: calculado, from } = this.esEuleriano || {};

    // Si el tipo de trayecto esperado es el calculado, o si es un ciclo
    // (incluso si se esperaba un camino), calcular el trayecto. Esta última
    // condición se debe que, a diferencia de los trayectos hamiltonianos, un
    // ciclo euleriano es un camino euleriano válido.
    if (tipo === calculado || calculado === Trayecto.ciclo) {
      return hierholzer(from);
    }

    // No existe ningún trayecto euleriano que cubra la totalidad del grafo.
    return false;
  }

  /**
   * Determina si el grafo contiene un trayecto hamiltoniano.
   *
   * @returns {InfoTrayecto|boolean} Tipo de trayecto hamiltoniano y nodo que
   * origina el trayecto, si existe; `false`, en caso contrario.
   *
   * A diferencia de los trayectos eulerianos, no existen condiciones
   * suficientes que cumplan los grafos para determinar si existe un trayecto
   * hamiltoniano. Esto se debe a que, tanto el problema de comprobar la
   * existencia de un trayecto hamiltoniano, como el de encontrar dichos
   * trayectos, son problemas NP-completos, y sus soluciones son polinómicas (y
   * no muy eficientes).
   */
  get esHamiltoniano() {
    // `true` si el grafo contiene algún camino hamiltoniano.
    const esCamino = Boolean(this.hamiltoniano(Trayecto.camino));

    if (esCamino) {
      return { tipo: Trayecto.camino };
    }

    // `true` si el grafo contiene algún ciclo hamiltoniano.
    const esCiclo = Boolean(this.hamiltoniano(Trayecto.ciclo));

    if (esCiclo) {
      return { tipo: Trayecto.ciclo };
    }

    // No existe ningún trayecto hamiltoniano que cubra la totalidad del grafo.
    return false;
  }

  /**
   * Obtiene el trayecto hamiltoniano, si el grafo contiene alguno.
   *
   * @param {Trayecto} [tipo=Trayecto.camino] - Tipo de trayecto hamiltoniano.
   * @returns {number[]|boolean} Trayecto hamiltoniano, si el grafo contiene
   * alguno, `false` en caso contrario.
   *
   * Encontrar cualquier trayecto hamiltoniano en un grafo es un problema
   * NP-completo y, por lo tanto, sus soluciones no son muy eficientes. La
   * implementación, en este caso, se realiza generando una permutación de la
   * lista de nodos por iteración, y retornando la primera que sea un trayecto
   * hamiltoniano válido. En el peor de los casos, la complejidad temporal de
   * ésta implementación es O(n * n!).
   */
  hamiltoniano(tipo = Trayecto.camino) {
    /**
     * Produce una permutación de una lista de números.
     *
     * @param {number[]} lista - Lista a calcular permutaciones.
     * @yields {number[]} La siguiente permutación de la lista de números.
     */
    const permutar = function* (lista) {
      // Caso base.
      if (lista.length === 1) {
        yield lista;
      } else {
        // Obtiene el primer elemento de la lista, y el resto de la lista.
        let [cabeza, ...resto] = lista;

        // Generación recursiva de permutaciones, una por cada iteración.
        for (const permutacion of permutar(resto)) {
          for (const i of lista.keys()) {
            // Divide en 2 la permutación, en el índice j.
            const [izquierda, derecha] = [permutacion.slice(0, i), permutacion.slice(i)];

            // Produce la siguiente permutación.
            yield [...izquierda, cabeza, ...derecha];
          }
        }
      }
    };

    // Se genera una permutación de la lista de nodos por iteración.
    for (let permutacion of permutar(this.nodos)) {
      // Comprueba si el tipo de trayecto esperado es un camino y si la
      // permutación es un trayecto válido en el grafo. En caso verdadero,
      // retornar la permutación.
      if (tipo === Trayecto.camino && this.esTrayecto(permutacion)) {
        return permutacion;
      }

      // Comprueba si el tipo de trayecto esperado es un ciclo.
      else if (tipo === Trayecto.ciclo) {
        // Se agrega al final de la permutación el primer elemento de ésta. Así,
        // se cumple la condicición de ciclo: el trayecto termina en el mismo
        // nodo que lo originó.
        permutacion.push(first(permutacion));

        // Si la permutación (modificada) es un trayecto válido en el grafo,
        // retornarla.
        if (this.esTrayecto(permutacion)) {
          return permutacion;
        }
      }
    }

    // No existe ningún trayecto hamiltoniano que cubra la totalidad del grafo.
    return false;
  }

  /**
   * Calcula el flujo máximo desde el nodo entrada hasta el nodo salida.
   *
   * @param {number} entrada - Nodo entrada.
   * @param {number} salida - Nodo salida.
   * @returns {number} Flujo máximo desde el nodo entrada hasta el nodo salida.
   *
   * Implementación del algoritmo de Edmonds-Karp, que a su vez es una
   * implementación del algoritmo de Ford-Fulkerson, utilizando búsqueda en
   * anchura (breadth-first search, BFS).
   */
  flujoMaximo(entrada, salida) {
    /**
     * @typedef {Object} CaminoDeAumento
     *   @property {number} flujoCamino - Capacidad residual mínima del camino
     *   de aumento.
     *   @property {number[]} padre - Lista de padres de cada nodo, siguiendo el
     *   camino de aumento.
     */
    /**
     * Recorre el grafo para encontrar un camino de aumento (CA).
     *
     * @param {number} entrada - Nodo donde comienza el camino de aumento.
     * @param {number} salida - Nodo donde termina el camino de aumento.
     * @param {number[][]} capacidad - Matriz de capacidades residuales de las
     * aristas del grafo.
     * @returns {CaminoDeAumento} Flujo del camino de aumento, y lista de padres
     * de cada nodo, siguiendo el mismo camino de aumento.
     *
     * Algoritmo de búsqueda en anchura (breadth-first search, BFS).
     */
    const caminoDeAumento = (entrada, salida, capacidad) => {
      // Arreglo utilizado para recordar los nodos padres de cada nodo i-ésimo
      // (si es que fue visitado).
      let padre = Array(n);

      // El nodo entrada no tiene padre.
      padre[entrada] = null;

      // Se utiliza una cola para almacenar los nodos que están en el mismo
      // nivel del nodo actual (nodo entrada, inicialmente), más el flujo del
      // CA asociado al nodo ingresado.
      for (let cola = [{ nodo: entrada, flujo: Infinity }]; !isEmpty(cola); ) {
        // Extrae el primer elemento de la cola.
        const { nodo: actual, flujo } = cola.shift();

        // Se exploran los adyacentes (de salida y de entrada) del nodo actual.
        for (const { nodo: siguiente } of this.adyacentes(actual, Direccion.ambas)) {
          // Capacidad residual de la arista {actual, siguiente}.
          const capacidadArista = capacidad[actual][siguiente];

          // Comprueba si el nodo siguiente no ha sido visitado (porque su padre
          // no está definido) y si la capacidad residual de la arista {actual,
          // siguiente} es positiva.
          if (padre[siguiente] === undefined && capacidadArista > 0) {
            // Recordar el nodo padre (nodo actual) del nodo siguiente.
            padre[siguiente] = actual;

            // Calcula la capacidad residual menor del CA.
            let flujoCamino = Math.min(flujo, capacidadArista);

            // Comprueba si se ha llegado al final del CA.
            if (siguiente === salida) {
              return { flujoCamino, padre };
            }

            // Ingresa a la cola el nodo siguiente (un nivel más abajo del nodo
            // de entrada).
            cola.push({ nodo: siguiente, flujo: flujoCamino });
          }
        }
      }

      // Si el flujo del camino es 0, entonces no se encontró ningún CA.
      return { flujoCamino: 0, padre };
    };

    const n = this.cantidad;

    // Flujo máximo inicial.
    let flujo = 0;

    // Matriz de capacidad residual (text de cada arista menos el flujo de cada
    // camino de aumento, CA).
    let capacidad = this.matrizDeAdyacencia;

    // Se itera hasta no encontrar más caminos de aumento (CA) en el grafo.
    // En este caso, un CA es cualquier camino simple que atraviese las aristas
    // cuya capacidad residual sea positiva.
    while (true) {
      // Busca un CA en el grafo y retorna la capacidad residual mínima del CA
      // encontrado, más la lista de padres de cada nodo que compone el CA.
      let { flujoCamino, padre } = caminoDeAumento(entrada, salida, capacidad);

      // Si ya no existen más CA, se termina la iteración.
      if (flujoCamino === 0) {
        break;
      }

      // Aumentar el flujo máximo en la cantidad de flujo del CA encontrado.
      flujo += flujoCamino;

      // Se recorre inversamente el CA (desde la salida hasta la entrada),
      // actualizando las capacidades residuales de cada arista (y sus inversas)
      // del CA.
      for (let actual = salida; actual !== entrada; actual = padre[actual]) {
        let anterior = padre[actual];

        // Aumentar la capacidad residual de la arista {actual, anterior} en la
        // capacidad residual mínima del CA.
        capacidad[actual][anterior] += flujoCamino;

        // Reducir la capacidad residual del inverso de la arista anterior en la
        // misma cantidad que se aumentó ésta última.
        capacidad[anterior][actual] -= flujoCamino;
      }
    }

    return flujo;
  }

  /**
   * @typedef {Object} ArbolGeneradorMinimo
   *   @property {Arista[]} arbol - Lista de aristas del árbol generador mínimo.
   *   @property {number} distancia - Distancia total del árbol generador
   *   mínimo.
   */
  /**
   * Construye un árbol generador mínimo del grafo.
   *
   * @returns {ArbolGeneradorMinimo} Árbol generador mínimo del grafo.
   *
   * Implementación del algoritmo de Kruskal, utilizando la estructura de
   * conjuntos disjuntos.
   */
  get arbolGeneradorMinimo() {
    let arbol = [];
    let conjunto = new ConjuntoDisjunto();

    // Crea un conjunto disjunto por cada nodo del grafo.
    for (const nodo of this.nodos) {
      conjunto.crear(nodo);
    }

    // Ordena la lista de aristas según sus pesos, ascendentemente.
    let aristas = this.listaDeAristas.sort((a, b) => a.text - b.text);

    for (const arista of aristas) {
      // Se sigue la cadena de nodos padres de un nodo hasta llegar a la raíz
      // que representa al conjunto que contiene dicho nodo.
      const raizOrigen = conjunto.buscar(arista.from);
      const raizDestino = conjunto.buscar(arista.to);

      // Si la raíz del nodo from no pertenece al mismo conjunto de la raíz
      // del nodo to, entonces la arista que une los nodos from y to
      // no forma un ciclo con el resto de las aristas del árbol, por lo que
      // puede ser agregada al árbol.
      if (raizOrigen !== raizDestino) {
        arbol.push(arista);

        // Une el conjunto de la raíz del nodo from con el conjunto de la raíz
        // del nodo to.
        conjunto.unir(raizOrigen, raizDestino);
      }
    }

    // Retorna el árbol y la distancia total del árbol (suma total de los pesos
    // de las aristas del árbol). Si las aristas no son ponderadas, asignar un
    // text 1.
    return {
      arbol: arbol,
      distancia: sumBy(arbol, (arista) => arista.text ?? 1),
    };
  }
}

module.exports = { Grafo, Celda, Trayecto, Arista, Direccion  };