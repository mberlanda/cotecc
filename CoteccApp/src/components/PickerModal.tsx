import React, {useState} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PickerModal = ({
  id,
  options,
  selectedValue,
  onValueChange,
  title,
}: {
  id: string;
  options: {[key: number | string]: string};
  title: string;
  selectedValue: number | string;
  onValueChange: (val: number | string) => void;
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (value: number | string) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={styles.text}>
          {title}: {options[selectedValue]}
        </Text>
      </TouchableOpacity>
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        />
        <View style={styles.modalContent}>
          <ScrollView>
            {Object.entries(options).map(([value, label]) => (
              <TouchableOpacity
                key={`${id}-${value}`}
                style={styles.option}
                onPress={() => handleSelect(value)}>
                <Text style={styles.optionText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  text: {
    color: 'blue',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    maxHeight: 200,
  },
  option: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    textAlign: 'center',
  },
});

export default PickerModal;
