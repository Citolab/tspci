export interface CES {
  typeIdentifier: string;

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

  /** @access public
   * Gets an array of resolved manifest media URLs.
   * @method getMedia
   * @deprecated not really deprecated, but bundled ci does not contain media ever again
   */
  getMedia: () => [];

  /** 
   * @access public
   * @deprecated not really deprecated, but bundled ci does not contain media ever again
   * Convenience function to adjust the height of the generated iframe 
   * to the current height of the custom interaction’s content height;
   * if that content’s visual size exceeds its layout box (e.g. by using box-shadow), 
   * an optional vertical margin can be specified.
   * @method setStageHeight
   * @arg NumberverticalMargin
   * @return void
   */
  setStageHeight: ([NumberverticalMargin]) => void;
}