import sortBy from 'lodash/sortBy';

export const splitWithOffsets = (text, offsets) => {
  let lastEnd = 0;
  const splits = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const offset of sortBy(offsets, (o) => o.start)) {
    const { start, end } = offset;
    if (lastEnd < start) {
      splits.push({
        start: lastEnd,
        end: start,
        content: text.slice(lastEnd, start),
      });
    }
    splits.push({
      ...offset,
      mark: true,
      content: text.slice(start, end),
    });
    lastEnd = end;
  }
  if (lastEnd < text.length) {
    splits.push({
      start: lastEnd,
      end: text.length,
      content: text.slice(lastEnd, text.length),
    });
  }

  return splits;
};

export const selectionIsEmpty = (selection) => {
  const position = selection.anchorNode.compareDocumentPosition(selection.focusNode);

  return position === 0 && selection.focusOffset === selection.anchorOffset;
};

export const selectionIsBackwards = (selection) => {
  if (selectionIsEmpty(selection)) return false;

  const position = selection.anchorNode.compareDocumentPosition(selection.focusNode);

  let backward = false;

  if ((!position && selection.anchorOffset > selection.focusOffset)
    || position === Node.DOCUMENT_POSITION_PRECEDING) {
    backward = true;
  }

  return backward;
};

export const selectionOverlaps = (start, end, highlights) => (
  highlights?.find((highlight) => {
    // find if our start/end are between any of the existing highlights' start/end indices
    if ((start < highlight.end && start > highlight.start)
      || (end > highlight.start && end < highlight.end)) {
      return true;
    }

    // make sure that selected start/end are both smaller or larger than existing starts/ends
    // so we don't end up with text that fully wraps an existing highlight
    if ((start < highlight.end && end > highlight.end)
      || (start < highlight.start && end > highlight.start)) {
      return true;
    }

    // catch an exact match
    if (start === highlight.start && end === highlight.end) {
      return true;
    }
    return false;
  })
);

// If the text selected spans outside of our text at all, we can end up with NaN
// so check for NaN or anything that isn't a number here
export const selectionOutOfRange = (start, end) => (
  typeof start !== 'number' || typeof end !== 'number'
    || Number.isNaN(start) || Number.isNaN(end)
);

/*
  A function to check the uniqueness of parameter names in Configs and Directives
  so we don't end up with duplicates
*/
// returning false rejects a name, true validates it
export const checkUniqueParameterName = (
  newName, mode, directive, configs, currentHighlight, content, highlights, isMoving
) => {
  // if repeatName is true (from either of the Array.finds below), this function returns false
  // and the yup.test validation rejects the *name* value as non-unique
  let repeatName;

  // merge together the directive and configs returned from dojo, then search for a match
  repeatName = [directive, ...configs].find((item) => {
    // if it is undefined (no directive set) or there are no params, don't continue
    if (!item || !item.parameters.length) return false;

    // loop through the item's parameters that have been saved to dojo (returned via SWR)
    return item.parameters.find((param) => {
      const sameName = param.annotation.name === newName;
      const sameConfig = item.path === content.content_id;
      const sameDirective = item.command === content;
      const differentPosition = param.start !== currentHighlight.start
        || param.end !== currentHighlight.end;

      // if we're moving a parameter
      if (isMoving) {
        /*
          and we're comparing our param name to one that's in the same config file or directive
          don't continue - we will handle these in the highlights check down below.
          The highlight being moved gets popped out of the highlights array, so we don't have to
          worry about it getting falsely flagged as a duplicate when we check for uniqueness.
        */
        if (item.cwd ? sameDirective : sameConfig) return false;
      }

      // if we are currently editing a directive
      if (mode === 'directive') {
        // and it doesn't match the previous directive, then ignore all matches with names
        // from the old directive because we want to allow any commands used in an old directive
        if (item.cwd && !sameDirective) return false;
      }

      // don't bother checking position if it isn't the same config, because we know we aren't
      // looking at our currently selected highlight
      if (!sameConfig && sameName) return true;

      // now if it's the same name and not in the same position, then reject it
      if (differentPosition && sameName) return true;

      // if it's in the same position in the same item, then we might be editing a param
      // and don't want to reject an existing name

      // otherwise, it's safe to continue
      return false;
    });
  });

  if (!repeatName) {
    // loop through highlights from the current annotation that haven't yet been saved to dojo
    repeatName = highlights.find((param) => {
      const differentPosition = param.start !== currentHighlight.start
        || param.end !== currentHighlight.end;
      const sameName = param.annotation.name === newName;

      // only return true if it isn't the current highlight
      if (differentPosition && sameName) return true;

      return false;
    });
  }

  // if we found a repeatName, return false so yup will show display the error
  if (repeatName) return false;

  return true;
};
