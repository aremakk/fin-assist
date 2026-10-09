import React, { forwardRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type KeyboardScrollProps = React.ComponentPropsWithoutRef<typeof KeyboardAwareScrollView>;
type KeyboardScrollRef = React.ComponentRef<typeof KeyboardAwareScrollView>;

/** Keeps every focused field comfortably above the keyboard, including nested inputs. */
export const KeyboardScrollView = forwardRef<KeyboardScrollRef, KeyboardScrollProps>(
  function KeyboardScrollView(
    {
      bottomOffset = 32,
      extraKeyboardSpace = 16,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = 'interactive',
      style,
      ...props
    },
    ref
  ) {
    return (
      <KeyboardAwareScrollView
        {...props}
        ref={ref}
        style={[{ flex: 1 }, style]}
        bottomOffset={bottomOffset}
        extraKeyboardSpace={extraKeyboardSpace}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
      />
    );
  }
);

/** FlatList keeps its virtualization and delegates keyboard scrolling to the same component. */
export function renderKeyboardScrollView(props: ScrollViewProps) {
  return <KeyboardScrollView {...props} />;
}
