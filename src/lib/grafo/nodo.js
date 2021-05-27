/**
 * Representación de un nodo adyacente.
 * @class
 */
 class Adyacente {
  /*
   * @constructor
   * @param {number} nodo - Nodo adyacente.
   * @param {number} text - text de la arista.
   */
  constructor(nodo, text) {
    this.nodo = nodo;
    this.text = text;
  }

  get esPonderado() {
    return Boolean(this.text);
  }
}

module.exports = { Adyacente };