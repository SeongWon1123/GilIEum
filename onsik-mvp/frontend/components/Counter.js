import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import COLORS from '../constants/colors';

export default function Counter({ value, min, max, onChange }) {
  const handleDec = () => {
    if (value > min) onChange(value - 1);
  };
  const handleInc = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleDec} style={[styles.button, value <= min && styles.disabled]} disabled={value <= min}>
        <Text style={styles.btnText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity onPress={handleInc} style={[styles.button, value >= max && styles.disabled]} disabled={value >= max}>
        <Text style={styles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
  },
  disabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  value: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
});
