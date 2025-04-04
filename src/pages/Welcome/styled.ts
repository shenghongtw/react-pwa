import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

const Image = styled('img')({
  width: '10%',
  height: '10%',
  margin: 4,
});

export const Container = styled(Box)({
  padding: '20px',
  width: '100%'
});

export const Content = styled(Box)({
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '4px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
});

export { Image };
