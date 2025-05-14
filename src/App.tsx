import React from 'react';
import { Box, Container, Flex, Text, Image } from '@chakra-ui/react';
import PresaleCard from './components/PresaleCard';
import './styles/Background.css';
import infaiLogo from './assets/infai.png';

function App() {
  return (
    <div className="dogecat-background">
      <Container 
        maxW="container.lg" 
        className="dogecat-content"
        display="flex" 
        flexDirection="column" 
        height="100%" 
      >
        {/* ScrollableFlex: This Flex grows and handles scrolling */}
        <Flex 
          direction="column" 
          flexGrow={1} 
          width="100%" 
          overflowY="auto" 
          minHeight="0" 
          className="scroll-container" // Added class for scrollbar styling
        >
          {/* Card Centering Area - This will grow and push footer down */}
          <Flex
            direction="column"
            flexGrow={1} // Key for pushing footer down
            width="100%"
            alignItems="center" // Horizontally center content in this area
            justifyContent="center" // Vertically center PresaleCard within this growing area
            py={4} // Padding around the card area
          >
            
            {/* Main presale card wrapper */}
            <Box 
              width="100%" // PresaleCard has its own maxW
              display="flex"
              justifyContent="center"
            >
              <PresaleCard />
            </Box>
          </Flex>
          
          {/* Footer wrapper - now a direct child of ScrollableFlex */}
          <Box 
            width="100%" 
            textAlign="center" 
            bg="rgba(255, 255, 255, 0.6)" 
            p={2} 
            borderRadius="md"
          >
            <Text fontSize="sm" color="gray.700">
              &copy; {new Date().getFullYear()} INFAI Token. All rights reserved.
            </Text>
          </Box>
        </Flex>
      </Container>
    </div>
  );
}

export default App;
