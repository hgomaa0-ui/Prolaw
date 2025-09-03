import { getAuth } from "@/lib/auth";

interface Client {
  id: number;
  name: string;
  contactEmail: string;
  phone: string;
  createdAt: string;
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const token = getAuth();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch("/api/clients", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch clients");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    throw new Error(error.message || "Failed to fetch clients");
  }
}

export async function createClient(clientData: Partial<Client>): Promise<Client> {
  try {
    const token = getAuth();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(clientData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create client");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error creating client:", error);
    throw new Error(error.message || "Failed to create client");
  }
}

export async function updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
  try {
    const token = getAuth();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(clientData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update client");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error updating client:", error);
    throw new Error(error.message || "Failed to update client");
  }
}

export async function deleteClient(id: number): Promise<void> {
  try {
    const token = getAuth();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`/api/clients/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete client");
    }
  } catch (error) {
    console.error("Error deleting client:", error);
    throw error;
  }
}