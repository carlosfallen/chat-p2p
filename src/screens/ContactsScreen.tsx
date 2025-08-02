import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useP2P } from '../context/P2PContext';

interface Props {
  navigation: any;
}

export default function ContactsScreen({ navigation }: Props) {
  const [searchSector, setSearchSector] = useState('');
  const [directId, setDirectId] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { getContactsBySector, addContact } = useP2P();

  const searchBySector = async () => {
    if (!searchSector.trim()) {
      Alert.alert('Erro', 'Digite um setor para buscar');
      return;
    }

    setLoading(true);
    try {
      const foundContacts = await getContactsBySector(searchSector.trim());
      setContacts(foundContacts);
    } catch (error) {
      Alert.alert('Erro', 'Falha na busca. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const addDirectContact = () => {
    if (!directId.trim()) {
      Alert.alert('Erro', 'Digite um ID válido');
      return;
    }

    addContact(directId.trim());
    navigation.navigate('Chat', {
      contactId: directId.trim(),
      contactName: directId.trim()
    });
  };

  const selectContact = (contactId: string) => {
    addContact(contactId);
    navigation.navigate('Chat', {
      contactId,
      contactName: contactId
    });
  };

  const renderContact = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => selectContact(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.contactId}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buscar por Setor</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Digite o setor"
            value={searchSector}
            onChangeText={setSearchSector}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={searchBySector}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '...' : 'Buscar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adicionar por ID</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Digite o ID do usuário"
            value={directId}
            onChangeText={setDirectId}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={addDirectContact}
          >
            <Text style={styles.buttonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {contacts.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>
            Contatos encontrados ({contacts.length})
          </Text>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item}
            renderItem={renderContact}
            style={styles.contactsList}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputFlex: {
    flex: 1,
    marginRight: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactId: {
    fontSize: 16,
    color: '#374151',
  },
});