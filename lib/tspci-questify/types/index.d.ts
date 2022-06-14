export interface CES {
  /** @access public
   * Sets the candidate response ‘as is’ (the format of the response and its state is the responsibility of the implementation).
   * @method setResponse
   * @arg data
   */
  setResponse: (data: string) => void;

  /** @access public
   * Gets the previously saved candidate response (if any).
   * @method getResponse
   * @return {String}
   */
  getResponse: () => string;

  // /** @access public
  //  * Gets an array of resolved manifest media URLs.
  //  * @method getMedia
  //  * @deprecated not really deprecated, but bundled ci does not contain media ever again
  //  */
  // getMedia: () => [];

  // /** 
  //  * @access public
  //  * @deprecated not really deprecated, but bundled ci does not contain media ever again
  //  * Convenience function to adjust the height of the generated iframe 
  //  * to the current height of the custom interaction’s content height;
  //  * if that content’s visual size exceeds its layout box (e.g. by using box-shadow), 
  //  * an optional vertical margin can be specified.
  //  * @method setStageHeight
  //  * @arg NumberverticalMargin
  //  * @return void
  //  */
  // setStageHeight: ([NumberverticalMargin]) => void;
}

export interface CI<ConfigProperties> {
  typeIdentifier: string;

  /** @access public
   *  @method getInstance Create a new instance of this portable custom interaction
   *  Will be called by the qtiCustomInteractionContext
   *  @param {DOM Element} dom - the DOM Element this PCI is being added to
   *  @param {Object} configuration - the configuration to apply to this PCI
   *  @param {String} state - a previous saved state to apply to this instance.
   *  This must have been obtained from a prior call to getState on an
   *  instance of this type (same typeIdentifier)
   */
   getInstance: (dom: HTMLElement, configuration: Configuration<ConfigProperties>, state: string) => void;
}

export declare type Configuration<T> = {
  properties: T;
};