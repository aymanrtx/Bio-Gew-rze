"use client";

import { Address } from "@/sanity.types";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import useStore from "@/store";
import { useAuth, useUser } from "@clerk/nextjs";
import { ShoppingBag, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Container from "@/components/Container";
import NoAccessToCart from "@/components/NoAccess";
import EmptyCart from "@/components/EmptyCart";
import { Button } from "@/components/ui/button";
import { Title } from "@/components/text";
import Link from "next/link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProductSideMenu from "@/components/ProductSideMenu";
import PriceFormatter from "@/components/PriceFormatter";
import QuantityButtons from "@/components/QuantityButtons";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { createCheckoutSession, Metadata } from "@/actions/createCheckoutSession";

const CartPage = () => {
  const {
    deleteCartProduct,
    getTotalPrice,
    getItemCount,
    getSubTotalPrice,
    resetCart,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const groupedItems = useStore((state) => state.getGroupedItems());
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    email: user?.emailAddresses?.[0]?.emailAddress || "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAddress((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddAddress = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // تحقق من جميع الحقول معمرين
    if (
      !newAddress.name.trim() ||
      !newAddress.email.trim() ||
      !newAddress.address.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.zip.trim()
    ) {
      toast.error("Please fill in all the required fields.");
      return;
    }

    const now = new Date().toISOString();
    const addressToAdd: Address = {
      ...newAddress,
      _id: Date.now().toString(),
      _type: "address",
      _createdAt: now,
      _updatedAt: now,
      _rev: "1",
      default: false,
    };

    setAddresses((prev) => (prev ? [...prev, addressToAdd] : [addressToAdd]));
    setSelectedAddress(addressToAdd);
    setShowAddressForm(false);
    setNewAddress({
      name: "",
      email: user?.emailAddresses?.[0]?.emailAddress || "",
      address: "",
      city: "",
      state: "",
      zip: "",
    });
    toast.success("Address added successfully!");
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const query = `*[_type=="address"] | order(publishedAt desc)`;
      const data = await client.fetch(query);
      setAddresses(data);
      const defaultAddress = data.find((addr: Address) => addr.default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (data.length > 0) {
        setSelectedAddress(data[0]);
      }
    } catch (error) {
      console.log("Addresses fetching error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleResetCart = () => {
    const confirmed = window.confirm("Are you sure you want to reset your cart?");
    if (confirmed) {
      resetCart();
      toast.success("Cart reset successfully!");
    }
  };

  const handleCheckout = async () => {
    if (!user?.id) {
      toast.error("User ID is missing. Please try logging out and logging back in.");
      return;
    }
    
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      toast.error("Email address is missing. Please check your account settings.");
      return;
    }
    
    setLoading(true);
    try {
      const metadata: Metadata = {
        orderNumber: crypto.randomUUID(),
        customerName: user?.fullName ?? "Unknown",
        customerEmail: user.emailAddresses[0].emailAddress,
        clerkUserId: user.id,
        address: selectedAddress,
      };
      
      console.log('Creating checkout session with metadata:', metadata);
      const checkoutUrl = await createCheckoutSession(groupedItems, metadata);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-52 md:pb-10">
      {isSignedIn ? (
        <Container>
          {groupedItems?.length ? (
            <>
              <div className="flex items-center gap-2 py-5">
                <ShoppingBag className="text-darkColor" />
                <Title>Shopping Cart</Title>
              </div>
              <div className="grid lg:grid-cols-3 md:gap-8">
                <div className="lg:col-span-2 rounded-lg">
                  <div className="border bg-white rounded-md">
                    {groupedItems?.map(({ product }) => {
                      const itemCount = getItemCount(product?._id);
                      return (
                        <div
                          key={product?._id}
                          className="border-b p-2.5 last:border-b-0 flex items-center justify-between gap-5"
                        >
                          <div className="flex flex-1 items-start gap-2 h-36 md:h-44">
                            {product?.images && (
                              <Link
                                href={`/product/${product?.slug?.current}`}
                                className="border p-0.5 md:p-1 mr-2 rounded-md overflow-hidden group"
                              >
                                <Image
                                  src={urlFor(product?.images[0]).url()}
                                  alt="productImage"
                                  width={500}
                                  height={500}
                                  loading="lazy"
                                  className="w-32 md:w-40 h-32 md:h-40 object-cover group-hover:scale-105 hoverEffect"
                                />
                              </Link>
                            )}
                            <div className="h-full flex flex-1 flex-col justify-between py-1">
                              <div className="flex flex-col gap-0.5 md:gap-1.5">
                                <h2 className="text-base font-semibold line-clamp-1">
                                  {product?.name}
                                </h2>
                                <p className="text-sm capitalize">
                                  Variant: <span className="font-semibold">{product?.variant}</span>
                                </p>
                                <p className="text-sm capitalize">
                                  Status: <span className="font-semibold">{product?.status}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <ProductSideMenu
                                        product={product}
                                        className="relative top-0 right-0"
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent className="font-bold">
                                      Add to Favorite
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Trash
                                        onClick={() => {
                                          deleteCartProduct(product?._id);
                                          toast.success("Product deleted successfully!");
                                        }}
                                        className="w-4 h-4 md:w-5 md:h-5 mr-1 text-gray-500 hover:text-red-600 hoverEffect"
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent className="font-bold bg-red-600">
                                      Delete product
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-start justify-between h-36 md:h-44 p-0.5 md:p-1">
                            <PriceFormatter
                              amount={(product?.price as number) * itemCount}
                              className="font-bold text-lg"
                            />
                            <QuantityButtons product={product} />
                          </div>
                        </div>
                      );
                    })}
                    <Button onClick={handleResetCart} className="m-5 font-semibold" variant="destructive">
                      Reset Cart
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="lg:col-span-1">
                    <div className="hidden md:inline-block w-full bg-white p-6 rounded-lg border">
                      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>SubTotal</span>
                          <PriceFormatter amount={getSubTotalPrice()} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Discount</span>
                          <PriceFormatter amount={getSubTotalPrice() - getTotalPrice()} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between font-semibold text-lg">
                          <span>Total</span>
                          <PriceFormatter amount={getTotalPrice()} className="text-lg font-bold text-black" />
                        </div>
                        <Button
                          className="w-full rounded-full font-semibold tracking-wide hoverEffect"
                          size="lg"
                          disabled={loading}
                          onClick={handleCheckout}
                        >
                          {loading ? "Please wait..." : "Proceed to Checkout"}
                        </Button>
                      </div>
                    </div>
                    {addresses && (
                      <div className="bg-white rounded-md mt-5">
                        <Card>
                          <CardHeader>Delivery address :{" "}
                            <span style={{ color: "red" }}>
                              Make sure you click and checked on the address
                            </span></CardHeader>
                          <CardContent>
                            <RadioGroup
                              defaultValue={addresses.find((addr) => addr.default)?._id.toString()}
                            >
                              {addresses.map((address) => (
                                <div
                                  key={address._id}
                                  onClick={() => setSelectedAddress(address)}
                                  className={`flex items-center space-x-2 mb-4 cursor-pointer ${selectedAddress?._id === address._id ? "text-shop_dark_green" : ""
                                    }`}
                                >
                                  <RadioGroupItem value={address._id.toString()} />
                                  <Label htmlFor={`address-${address._id}`} className="grid gap-1.5 flex-1">
                                    <span className="font-semibold">{address.name}</span>
                                    <span className="text-sm text-black/60">
                                      {address.address}, {address.city}, {address.state} {address.zip}
                                    </span>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                            <Button variant="outline" className="w-full mt-4" onClick={() => setShowAddressForm(true)}>
                              Add New Address
                            </Button>

                            {showAddressForm && (
                              <form onSubmit={handleAddAddress} className="mt-4 space-y-4">
                                <div>
                                  <Label htmlFor="name">Name</Label>
                                  <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    className="w-full border rounded px-2 py-1"
                                    value={newAddress.name}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="email">Email</Label>
                                  <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full border rounded px-2 py-1"
                                    value={newAddress.email}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="address">Address</Label>
                                  <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    required
                                    className="w-full border rounded px-2 py-1"
                                    value={newAddress.address}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="city">City</Label>
                                  <input
                                    id="city"
                                    name="city"
                                    type="text"
                                    required
                                    className="w-full border rounded px-2 py-1"
                                    value={newAddress.city}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="state">State</Label>
                                  <input
                                    id="state"
                                    name="state"
                                    type="text"
                                    required
                                    className="w-full border rounded px-2 py-1"
                                    value={newAddress.state}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="zip">Zip Code</Label>
                                  <input
                                    id="zip"
                                    name="zip"
                                    type="text"
                                    required
                                    className="w-full border rounded px-2 py-1"
                                    value={newAddress.zip}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button type="submit" className="flex-1">
                                    Save Address
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowAddressForm(false)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>

                {/* ordersummary mobile */}
                <div className="md:hidden fixed bottom-0 left-0 w-full bg-white pt-2">
                  <div className="bg-white p-4 rounded-lg border mx-4">
                    <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>SubTotal</span>
                        <PriceFormatter amount={getSubTotalPrice()} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Discount</span>
                        <PriceFormatter amount={getSubTotalPrice() - getTotalPrice()} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between font-semibold text-lg">
                        <span>Total</span>
                        <PriceFormatter amount={getTotalPrice()} className="text-lg font-bold text-black" />
                      </div>
                      <Button
                        className="w-full rounded-full font-semibold tracking-wide hoverEffect"
                        size="lg"
                        disabled={loading}
                        onClick={handleCheckout}
                      >
                        {loading ? "Please wait..." : "Proceed to Checkout"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyCart />
          )}
        </Container>
      ) : (
        <NoAccessToCart />
      )}
    </div>
  );
};

export default CartPage;

