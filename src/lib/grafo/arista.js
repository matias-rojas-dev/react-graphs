const { Adyacente } = require("./nodo.js");

/**
 * @enum {number}
 *
 * Representa la dirección de una arista.
 */
const Direccion = Object.freeze({
  salida: 1,
  entrada: 2,
  ambas: 3,
});

/**
 * Representación de una arista.
 * @class
 */
class Arista {
  /**
   * @constructor
   * @param {number} from - Nodo from.
   * @param {number|Adyacente} to - Nodo to.
   * @param {number} text - text de la arista.
   *
   * Notar que si el nodo to es de tipo `Adyacente`, el parámetro text es
   * ignorado.
   */
  constructor(from, to, text) {
    this.from = from;

    if (to instanceof Adyacente) {
      this.to = to.nodo;
      this.text = to.text;
    } else {
      this.to = to;
      this.text = text;
    }
  }

  /**
   * @typedef {Object} Link
   *   @property {string} from - from de la arista.
   *   @property {string} to - to de la arista.
   *   @property {string} text - text de la arista.
   */
  /**
   * Construye una lista a partir de un link.
   *
   * @param {Link} link - Link.
   */
  static desdeLink(link) {
    const { from, to, text } = link;
    return new Arista(Number(from), Number(to), text == null ? undefined : Number(text));
  }

  /**
   * Comprueba si la arista es ponderada.
   *
   * @returns {boolean} `true` si la arista es ponderada, `false` en caso
   * contrario.
   */
  get esPonderada() {
    return this.text != null;
  }

  /**
   * Convierte la arista a un link.
   *
   * @returns {Link} Link.
   */
  get link() {
    return {
      from: this.from,
      to: this.to,
      text: this.text,
    };
  }
}

module.exports = { Arista, Direccion };