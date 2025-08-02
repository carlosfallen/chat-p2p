import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { P2PProvider } from './src/context/P2PContext';
import LoginScreen from './src/screens/LoginScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <P2PProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: '#2563eb' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Conversations" 
            component={ConversationsScreen}
            options={{ title: 'Conversas', headerLeft: () => null }}
          />
          <Stack.Screen 
            name="Contacts" 
            component={ContactsScreen}
            options={{ title: 'Contatos' }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={({ route }) => ({ 
              title: route.params?.contactName || 'Chat' 
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </P2PProvider>
  );
}