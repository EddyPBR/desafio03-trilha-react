import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product }: { data: Product } = await api.get(`/products/${productId}`);

      const productExists = cart.find((cartProduct) => cartProduct.id === productId);

      if(!productExists) {
        const productWithAmount = {...product, amount: 1};

        const updatedCart = [...cart, productWithAmount];

        setCart(updatedCart);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
        return;
      }

      const { data: productStock }: { data: Stock } = await api.get(`/stock/${productId}`);

      if(productExists.amount === productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map((cartProduct) => {
        if(cartProduct.id === productId) {
          cartProduct.amount = cartProduct.amount + 1;
        }

        return cartProduct;
      });

      setCart(updatedCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if(!product) {
        throw new Error("Produto não encontrado");
      };

      const updatedCart = cart.filter((product) => product.id !== productId);
      
      setCart(updatedCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if(!productExists) {
        throw new Error("Produto não encontrado");
      };

      if(amount < 1) {
        throw new Error("Quantidade mínima atingida");
      }

      const { data: productStock }: { data: Stock } = await api.get(`/stock/${productId}`);

      if(amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.filter((product) => {
        if(product.id === productId) {
          product.amount = amount;
        }

        return product;
      });

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
